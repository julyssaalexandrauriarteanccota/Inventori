import { StreamableFile } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';
import { Readable } from 'stream';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();
  const context = {} as never;

  it('envuelve respuestas JSON normales', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(context, {
        handle: () => of({ ok: true }),
      }),
    );

    expect(result).toEqual({
      data: { ok: true },
      meta: { timestamp: expect.any(String) },
    });
  });

  it('no envuelve StreamableFile para no corromper descargas', async () => {
    const file = new StreamableFile(Readable.from(Buffer.from('<xml />')));
    const result = await firstValueFrom(
      interceptor.intercept(context, {
        handle: () => of(file),
      }),
    );

    expect(result).toBe(file);
  });
});
