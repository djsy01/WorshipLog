import { NestFactory } from '@nestjs/core';
import { ConsoleLogger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ServerResponse } from 'http';
import { AppModule } from './app.module';
import { StorageService } from './storage/storage.service';
import { configureHttp } from './common/http/configure-http';
import { JwtConfigurationError } from './auth/jwt-settings';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: false,
    bodyParser: false,
    logger: false,
  });
  app.set('trust proxy', 'loopback');
  const production = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT || '3000');
  const host = process.env.HOST || '127.0.0.1';
  configureHttp(app, process.env.CLIENT_URL);
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
  await app.listen(port, host);
  app.useLogger(new ConsoleLogger());
  console.log(`서버가 ${port}번 포트에서 실행 중입니다.`);
}
void bootstrap().catch((error: unknown) => {
  const message =
    error instanceof JwtConfigurationError
      ? error.message
      : '서버를 시작할 수 없습니다.';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
