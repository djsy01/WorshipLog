import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { SongsModule } from './songs/songs.module';
import { BibleModule } from './bible/bible.module';
import { SpotifyModule } from './spotify/spotify.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    SongsModule,
    BibleModule,
    SpotifyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
