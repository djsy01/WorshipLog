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
import * as crypto from 'crypto';
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
    private config: ConfigService,
    private redis: RedisService,
    private mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('이미 사용 중인 이메일입니다.');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name },
    });

    // 이메일 전송은 백그라운드로 — 전송 실패해도 가입 응답은 즉시 반환
    this.sendVerificationToken(user.id, user.email, user.name).catch(() => null);
    return { message: '가입이 완료되었습니다. 이메일을 확인해주세요.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid)
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    if (!user.emailVerified)
      throw new ForbiddenException('이메일 인증이 필요합니다. 메일함을 확인해주세요.');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return { user: this.sanitize(user), ...tokens };
  }

  async verifyEmail(token: string) {
    const userId = await this.redis.get(`email_verify:${token}`);
    if (!userId) throw new BadRequestException('유효하지 않거나 만료된 인증 링크입니다.');

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });

    await this.redis.del(`email_verify:${token}`);

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return { user: this.sanitize(user), ...tokens };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('존재하지 않는 이메일입니다.');
    if (user.emailVerified) throw new BadRequestException('이미 인증된 이메일입니다.');

    try {
      await this.sendVerificationToken(user.id, user.email, user.name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(`이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요. (${msg})`);
    }
    return { message: '인증 이메일을 재발송했습니다.' };
  }

  async logout(userId: string) {
    await this.redis.del(`refresh:${userId}`);
    return { message: '로그아웃 되었습니다.' };
  }

  async refresh(userId: string, refreshToken: string) {
    const stored = await this.redis.get(`refresh:${userId}`);
    if (!stored) throw new UnauthorizedException('다시 로그인해주세요.');

    const valid = await bcrypt.compare(refreshToken, stored);
    if (!valid) throw new UnauthorizedException('유효하지 않은 토큰입니다.');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  private async sendVerificationToken(userId: string, email: string, name: string) {
    const token = crypto.randomBytes(32).toString('hex');
    await this.redis.set(`email_verify:${token}`, userId, EMAIL_VERIFY_TTL);
    await this.mail.sendVerificationEmail(email, name, token);
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string) {
    const hashed = await bcrypt.hash(token, 10);
    const ttl = 7 * 24 * 60 * 60;
    await this.redis.set(`refresh:${userId}`, hashed, ttl);
  }

  private sanitize(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
