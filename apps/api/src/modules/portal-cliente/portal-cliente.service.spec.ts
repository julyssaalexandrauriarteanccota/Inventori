import { BadRequestException } from '@nestjs/common';
import { PortalClienteService } from './portal-cliente.service';

describe('PortalClienteService', () => {
  let prisma: {
    comprobante: { findFirst: jest.Mock };
    portalAccessLog: { create: jest.Mock };
  };
  let storage: {
    exists: jest.Mock;
    getSignedUrl: jest.Mock;
    readObjectBuffer: jest.Mock;
  };
  let service: PortalClienteService;

  beforeEach(() => {
    prisma = {
      comprobante: { findFirst: jest.fn() },
      portalAccessLog: { create: jest.fn().mockResolvedValue({}) },
    };
    storage = {
      exists: jest.fn(),
      getSignedUrl: jest.fn(),
      readObjectBuffer: jest.fn(),
    };
    service = new PortalClienteService(prisma as never, storage as never);
  });

  it('devuelve redireccion firmada para descargas en MinIO', async () => {
    prisma.comprobante.findFirst.mockResolvedValue({
      id: 'cmp-1',
      numero: 'F001-00000042',
      xmlStorageKey: 'cpe-beta/20123456789/BETA/2026/05/factura/test.xml',
      cdrStorageKey: null,
      pdfStorageKey: null,
    });
    storage.exists.mockResolvedValue(true);
    storage.getSignedUrl.mockResolvedValue(
      'https://minio.local/cpe-beta/test.xml?X-Amz-Signature=abc',
    );

    const result = await service.descargar('token', 'xml', {
      ip: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(result).toEqual({
      kind: 'redirect',
      filename: 'F001-00000042.xml',
      contentType: 'application/xml',
      redirectUrl: 'https://minio.local/cpe-beta/test.xml?X-Amz-Signature=abc',
    });
    expect(storage.readObjectBuffer).not.toHaveBeenCalled();
    expect(prisma.portalAccessLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        comprobanteId: 'cmp-1',
        accion: 'DOWNLOAD_XML',
      }),
    });
  });

  it('rechaza artefactos no permitidos antes de consultar storage', async () => {
    await expect(
      service.descargar('token', 'json', { ip: '127.0.0.1' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.comprobante.findFirst).not.toHaveBeenCalled();
    expect(storage.exists).not.toHaveBeenCalled();
  });

  it('mantiene fallback local por stream cuando no hay URL http firmada', async () => {
    const content = Buffer.from('<xml />');
    prisma.comprobante.findFirst.mockResolvedValue({
      id: 'cmp-2',
      numero: 'B001-00000007',
      xmlStorageKey: 'cpe-beta/20123456789/BETA/2026/05/boleta/test.xml',
      cdrStorageKey: null,
      pdfStorageKey: null,
    });
    storage.exists.mockResolvedValue(true);
    storage.getSignedUrl.mockResolvedValue('local://cpe-beta%2Ftest.xml');
    storage.readObjectBuffer.mockResolvedValue(content);

    const result = await service.descargar('token', 'xml', {
      ip: '127.0.0.1',
    });

    expect(result).toEqual({
      kind: 'stream',
      filename: 'B001-00000007.xml',
      contentType: 'application/xml',
      content,
    });
  });
});
