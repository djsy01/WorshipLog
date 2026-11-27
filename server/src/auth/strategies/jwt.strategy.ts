import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';
import { readJwtSettings } from '../jwt-settings';
import { AuthenticatedUser } from '../authenticated-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          const streamPath =
            /^\/api\/rooms\/(?:stream\/org|[^/]+\/stream)\/?$/i;
          const token = req.query.token;
          return req.method === 'GET' &&
            streamPath.test(req.path) &&
            typeof token === 'string'
            ? token
            : null;
        },
      ]),
      secretOrKey: readJwtSettings(config).accessSecret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: AuthenticatedUser) {
    if (
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      !Number.isSafeInteger(payload.exp)
    ) {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { email: true, role: true },
    });
    if (!user) throw new UnauthorizedException();
    return {
      sub: payload.sub,
      email: user.email,
      role: user.role,
      exp: payload.exp,
    };
  }
}
