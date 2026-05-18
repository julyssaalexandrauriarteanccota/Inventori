import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { createTestApp, TestAppContext } from './test-app.factory';

describe('Uploads (e2e)', () => {
  let app: INestApplication;
  let context: TestAppContext;
  let fixturePath: string;

  beforeEach(async () => {
    context = await createTestApp();
    app = context.app;
    fixturePath = path.join(os.tmpdir(), `upload-fixture-${Date.now()}.pdf`);
    fs.writeFileSync(fixturePath, 'pdf fixture');
    context.uploadsMock.getFilePath.mockReturnValue(fixturePath);
  });

  afterEach(async () => {
    if (fs.existsSync(fixturePath)) {
      fs.unlinkSync(fixturePath);
    }
    await app.close();
  });

  async function loginAsAdmin() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@erp.local',
        password: 'Admin123!',
      })
      .expect(200);

    return response.body.data.accessToken as string;
  }

  it('rechaza upload sin autenticacion', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .attach('file', Buffer.from('pdf fixture'), {
        filename: 'archivo.pdf',
        contentType: 'application/pdf',
      })
      .expect(401);
  });

  it('permite subir archivo autenticado', async () => {
    const token = await loginAsAdmin();

    const response = await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('pdf fixture'), {
        filename: 'archivo.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(response.body.data.filename).toBe('mock-file.pdf');
    expect(context.uploadsMock.saveFile).toHaveBeenCalled();
  });

  it('permite descargar archivo autenticado', async () => {
    const token = await loginAsAdmin();

    const response = await request(app.getHttpServer())
      .get('/api/v1/uploads/mock-file.pdf')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.toString()).toBe('pdf fixture');
  });
});
