import { Test, TestingModule } from '@nestjs/testing';
import { Body, Controller, Post } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { IsString } from 'class-validator';
import { configureHttp } from '../src/common/http/configure-http';
import { HealthController } from '../src/health/health.controller';

class TestDto {
  @IsString()
  value!: string;
}

@Controller('test')
class TestController {
  @Post()
  create(@Body() dto: TestDto) {
    if (dto.value === 'error') throw new Error('민감한 내부 정보');
    return dto;
  }
}

describe('AppController (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController, TestController],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureHttp(app, 'https://app.example.com');
    await app.init();
  });

  afterAll(() => app.close());

  it('헬스 체크에 헤더를 적용하고 허용된 출처만 응답한다', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'https://app.example.com')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('Access-Control-Allow-Origin', 'https://app.example.com')
      .expect(200);
    const result = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'https://other.example.com')
      .expect(200);
    expect(result.headers).not.toHaveProperty('access-control-allow-origin');
  });

  it('정의되지 않은 본문 필드를 거부한다', () => {
    return request(app.getHttpServer())
      .post('/api/test')
      .send({ value: 'ok', extra: true })
      .expect(400);
  });

  it('잘못된 JSON 본문의 내용을 응답에 넣지 않는다', () => {
    return request(app.getHttpServer())
      .post('/api/test')
      .type('json')
      .send('민감한내용')
      .expect(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: '요청 본문을 읽을 수 없습니다.',
      });
  });

  it('예상치 못한 예외의 내부 정보를 응답에서 숨긴다', () => {
    return request(app.getHttpServer())
      .post('/api/test')
      .send({ value: 'error' })
      .expect(500, {
        statusCode: 500,
        message: '내부 서버 오류가 발생했습니다.',
      });
  });
});
