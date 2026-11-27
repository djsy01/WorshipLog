import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';

const config = new ConfigService({
  JWT_ACCESS_SECRET: 'a'.repeat(64),
  JWT_REFRESH_SECRET: 'b'.repeat(64),
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '30d',
});
const user = { id: 'user-id', email: 'user@example.com', role: 'user' };
const prisma = {
  user: { findUnique: jest.fn().mockResolvedValue(user) },
} as unknown as PrismaService;

it('관리자 토큰의 역할을 현재 DB 역할로 대체한다', async () => {
  const strategy = new JwtStrategy(config, prisma);
  const payload = { sub: user.id, email: user.email, role: 'admin', exp: 1 };
  await expect(strategy.validate(payload)).resolves.toMatchObject({
    role: 'user',
  });
});

it('같은 리프레시 토큰을 동시에 제출해도 한 번만 회전한다', async () => {
  let current: string | undefined;
  const redis = {
    get: jest.fn(() => current),
    set: jest.fn((_key: string, value: string) => {
      current = value;
    }),
    replaceIfEqual: jest.fn((_key: string, old: string, next: string) => {
      if (old !== current) return false;
      current = next;
      return true;
    }),
  };
  const service = new AuthService(
    prisma,
    new JwtService(),
    config,
    redis as unknown as RedisService,
    {} as MailService,
  );
  const prefix = 'x'.repeat(80);
  const previous = `${prefix}-previous-token`;
  await service['saveRefreshToken'](user.id, previous);
  await expect(
    service.refresh(user.id, `${prefix}-different`),
  ).rejects.toThrow();
  const results = await Promise.allSettled([
    service.refresh(user.id, previous),
    service.refresh(user.id, previous),
  ]);
  expect(results.map(({ status }) => status).sort()).toEqual([
    'fulfilled',
    'rejected',
  ]);
});
