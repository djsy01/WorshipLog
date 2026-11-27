import { ConfigService } from '@nestjs/config';

export class JwtConfigurationError extends Error {}

const secondsPerUnit: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

function expiry(config: ConfigService, key: string, fallback: string) {
  const value = config.get<string>(key) || fallback;
  const match = /^(\d+)([smhd]?)$/.exec(value);
  const seconds = match
    ? Number(match[1]) * secondsPerUnit[match[2] || 's']
    : 0;
  if (!Number.isSafeInteger(seconds) || seconds <= 0 || seconds > 2 ** 31 - 1) {
    throw new JwtConfigurationError(
      `${key}에 올바른 만료 시간을 설정해야 합니다.`,
    );
  }
  return seconds;
}

export function readJwtSettings(config: ConfigService) {
  const accessSecret = config.get<string>('JWT_ACCESS_SECRET')?.trim();
  const refreshSecret = config.get<string>('JWT_REFRESH_SECRET')?.trim();
  if (
    !accessSecret ||
    Buffer.byteLength(accessSecret) < 32 ||
    !refreshSecret ||
    Buffer.byteLength(refreshSecret) < 32 ||
    accessSecret === refreshSecret
  ) {
    throw new JwtConfigurationError(
      'JWT 비밀키는 서로 다르게 32바이트 이상으로 설정해야 합니다.',
    );
  }

  return {
    accessSecret,
    refreshSecret,
    accessSeconds: expiry(config, 'JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshSeconds: expiry(config, 'JWT_REFRESH_EXPIRES_IN', '30d'),
  };
}
