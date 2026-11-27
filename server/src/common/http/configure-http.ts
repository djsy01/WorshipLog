import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { HttpErrorsFilter } from './http-errors.filter';

const redactInvalidBody: ErrorRequestHandler = (
  error: unknown,
  _req,
  _res,
  next,
) => {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    error.status === 400
  ) {
    next(new BadRequestException('요청 본문을 읽을 수 없습니다.'));
    return;
  }
  next(error);
};

export function configureHttp(app: NestExpressApplication, clientUrl?: string) {
  app.setGlobalPrefix('api');
  app.use('/api', helmet());
  app.useGlobalFilters(new HttpErrorsFilter(app.getHttpAdapter()));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
    }),
  );

  const origins = (clientUrl ?? 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });
  app.useBodyParser('json', { limit: '100kb' });
  app.useBodyParser<{ limit: string; extended: boolean }>('urlencoded', {
    limit: '100kb',
    extended: true,
  });
  app.use(redactInvalidBody);
}
