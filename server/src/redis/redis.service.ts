import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL');

    if (redisUrl) {
      // Render 등 URL 형태로 제공되는 경우 (redis:// or rediss://)
      this.client = new Redis(redisUrl, {
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
      });
    } else {
      this.client = new Redis({
        host: this.config.get('REDIS_HOST', 'localhost'),
        port: this.config.get<number>('REDIS_PORT', 6379),
        password: this.config.get('REDIS_PASSWORD'),
        tls: this.config.get('REDIS_TLS') === 'true' ? {} : undefined,
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
      });
    }

    this.client.on('error', () => {
      this.logger.error('Redis 연결에 실패했습니다.');
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async replaceIfEqual(
    key: string,
    current: string,
    next: string,
    ttl: number,
  ) {
    const updated = await this.client.eval(
      "if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end " +
        "return redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]) and 1",
      1,
      key,
      current,
      next,
      ttl,
    );
    return updated === 1;
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
