import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class HttpErrorsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(HttpErrorsFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    if (error instanceof HttpException) {
      return super.catch(error, host);
    }

    const status =
      error && typeof error === 'object' && 'statusCode' in error
        ? error.statusCode
        : undefined;
    if (
      typeof status === 'number' &&
      Number.isInteger(status) &&
      status >= 400 &&
      status < 500
    ) {
      return super.catch(
        new HttpException('요청을 처리할 수 없습니다.', status),
        host,
      );
    }

    this.logger.error('요청 처리 중 서버 오류가 발생했습니다.');
    return super.catch(
      new HttpException('내부 서버 오류가 발생했습니다.', 500),
      host,
    );
  }
}
