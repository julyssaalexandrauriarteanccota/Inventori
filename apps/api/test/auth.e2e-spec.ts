import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp, TestAppContext } from './test-app.factory';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let context: TestAppContext;

  beforeEach(async () => {
    context = await createTestApp();
    app = context.app;
  });

  afterEach(async () => {
    await app.close();
  });

  it('permite login y devuelve tokens con usuario envuelto', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@erp.local',
        password: 'Admin123!',
      })
      .expect(200);

    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.refreshToken).toBeTruthy();
    expect(response.body.data.user.email).toBe('admin@erp.local');
    expect(response.body.meta.timestamp).toBeTruthy();
  });

  it('rechaza login con credenciales invalidas', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@erp.local',
        password: 'Incorrecta123!',
      })
      .expect(401);

    expect(response.body.error.statusCode).toBe(401);
  });

  it('permite obtener el perfil autenticado con bearer token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@erp.local',
        password: 'Admin123!',
      })
      .expect(200);

    const meResponse = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
      .expect(200);

    expect(meResponse.body.data.email).toBe('admin@erp.local');
    expect(meResponse.body.data.rol).toBe('ADMIN');
  });

  it('aplica rate limiting en login luego de 5 intentos por minuto', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@erp.local',
          password: 'Incorrecta123!',
        })
        .expect(401);
    }

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@erp.local',
        password: 'Incorrecta123!',
      })
      .expect(429);

    expect(response.body.error.statusCode).toBe(429);
  });
});
