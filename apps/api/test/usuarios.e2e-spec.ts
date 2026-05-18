import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp, TestAppContext } from './test-app.factory';

describe('Usuarios (e2e)', () => {
  let app: INestApplication;
  let context: TestAppContext;

  beforeEach(async () => {
    context = await createTestApp();
    app = context.app;
  });

  afterEach(async () => {
    await app.close();
  });

  async function login(email: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.data.accessToken as string;
  }

  it('permite a ADMIN listar usuarios', async () => {
    const token = await login('admin@erp.local', 'Admin123!');

    const response = await request(app.getHttpServer())
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.total).toBe(2);
  });

  it('rechaza a TECNICO en listado de usuarios', async () => {
    const token = await login('tecnico@erp.local', 'Tecnico123!');

    const response = await request(app.getHttpServer())
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body.error.statusCode).toBe(403);
  });
});
