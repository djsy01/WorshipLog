import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { readJwtSettings } from '../jwt-settings';
import { AuthenticatedUser } from '../authenticated-user';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: readJwtSettings(config).refreshSecret,
      algorithms: ['HS256'],
      passReqToCallback: true as const,
    });
  }

  validate(req: Request, payload: AuthenticatedUser) {
    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (
      !refreshToken ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      !Number.isSafeInteger(payload.exp)
    ) {
      throw new UnauthorizedException();
    }
    return { sub: payload.sub, refreshToken };
  }
}
