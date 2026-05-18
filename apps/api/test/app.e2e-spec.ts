import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp, TestAppContext } from './test-app.factory';

describe('App bootstrap (e2e)', () => {
  let app: INestApplication;
  let context: TestAppContext;

  beforeEach(async () => {
    context = await createTestApp();
    app = context.app;
  });

  it('expone health publico bajo el prefijo global', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(503)
      .expect((response: { body: { error: { statusCode: number } } }) => {
        expect(response.body.error.statusCode).toBe(503);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
