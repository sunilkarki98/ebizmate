import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PingController } from './../src/health/ping.controller';

/**
 * Lightweight smoke test — does not boot full AppModule (avoids Redis/DB in CI).
 * Full-stack checks belong in deployment verification or a dedicated integration job.
 */
describe('API smoke (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('GET /api/ping returns liveness payload', () => {
    return request(app.getHttpServer())
      .get('/api/ping')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('ebizmate-api');
      });
  });
});
