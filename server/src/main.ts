import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ServerResponse } from 'http';
import { AppModule } from './app.module';
import { StorageService } from './storage/storage.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 'loopback');
  const production = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT || '3000');
  const host = process.env.HOST || (production ? '127.0.0.1' : '0.0.0.0');
  if (!production) {
    app.useStaticAssets(app.get(StorageService).root, {
      prefix: '/uploads',
      index: false,
      dotfiles: 'deny',
      setHeaders: (response: ServerResponse) => {
        response.setHeader('X-Content-Type-Options', 'nosniff');
      },
    });
  }
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const allowedOrigins = (process.env.CLIENT_URL ?? 'http://localhost:3001')
    .split(',')
    .map((s) => s.trim());
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  });
  await app.listen(port, host);
  console.log(`Server running on http://localhost:${port}/api`);
}
void bootstrap();
