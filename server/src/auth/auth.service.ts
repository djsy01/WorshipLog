import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { User } from '@prisma/client';
import { readJwtSettings } from './jwt-settings';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const EMAIL_VERIFY_TTL = 60 * 60 * 24; // 24시간

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    config: ConfigService,
    private redis: RedisService,
    private mail: MailService,
  ) {
    this.jwt = readJwtSettings(config);
  }

  private readonly jwt: ReturnType<typeof readJwtSettings>;

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('이미 사용 중인 이메일입니다.');

    if (Buffer.byteLength(dto.password) > 72) {
      throw new BadRequestException('비밀번호는 72바이트 이하여야 합니다.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name },
    });

    // 이메일 전송은 백그라운드로 — 전송 실패해도 가입 응답은 즉시 반환
    void this.sendVerificationToken(user.id, user.email, user.name).catch(
      () => null,
    );
    return { message: '가입이 완료되었습니다. 이메일을 확인해주세요.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash)
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid)
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );

    if (!user.emailVerified)
      throw new ForbiddenException(
        '이메일 인증이 필요합니다. 메일함을 확인해주세요.',
      );

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return { user: this.sanitize(user), ...tokens };
  }

  async verifyEmail(token: string) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      throw new BadRequestException('유효하지 않거나 만료된 인증 링크입니다.');
    }
    const userId = await this.redis.get(`email_verify:${token}`);
    if (!userId)
      throw new BadRequestException('유효하지 않거나 만료된 인증 링크입니다.');

    const updated = await this.prisma.user.updateMany({
      where: { id: userId, emailVerified: false },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });
    if (!updated.count) {
      throw new BadRequestException('유효하지 않거나 만료된 인증 링크입니다.');
    }
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    await this.redis.del(`email_verify:${token}`);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return { user: this.sanitize(user), ...tokens };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('존재하지 않는 이메일입니다.');
    if (user.emailVerified)
      throw new BadRequestException('이미 인증된 이메일입니다.');

    try {
      await this.sendVerificationToken(user.id, user.email, user.name);
    } catch {
      throw new BadRequestException(
        '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
      );
    }
    return { message: '인증 이메일을 재발송했습니다.' };
  }

  async logout(userId: string) {
    await this.redis.del(`refresh:${userId}`);
    return { message: '로그아웃 되었습니다.' };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('다시 로그인해주세요.');

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const replaced = await this.redis.replaceIfEqual(
      `refresh:${userId}`,
      this.refreshDigest(refreshToken),
      this.refreshDigest(tokens.refreshToken),
      this.jwt.refreshSeconds,
    );
    if (!replaced) throw new UnauthorizedException('다시 로그인해주세요.');
    return tokens;
  }

  private async sendVerificationToken(
    userId: string,
    email: string,
    name: string,
  ) {
    const token = randomBytes(32).toString('hex');
    await this.redis.set(`email_verify:${token}`, userId, EMAIL_VERIFY_TTL);
    await this.mail.sendVerificationEmail(email, name, token);
  }

  private async generateTokens(userId: string, email: string, role = 'user') {
    const payload = { sub: userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.jwt.accessSecret,
        expiresIn: this.jwt.accessSeconds,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.jwt.refreshSecret,
        jwtid: randomUUID(),
        expiresIn: this.jwt.refreshSeconds,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string) {
    await this.redis.set(
      `refresh:${userId}`,
      this.refreshDigest(token),
      this.jwt.refreshSeconds,
    );
  }

  private refreshDigest(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async updateFcmToken(userId: string, token: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: token },
    });
    return { message: 'ok' };
  }

  private sanitize(user: User) {
    const { passwordHash: _passwordHash, ...rest } = user;
    return rest;
  }
}
