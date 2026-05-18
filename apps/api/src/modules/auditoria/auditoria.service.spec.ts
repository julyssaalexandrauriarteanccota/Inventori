import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaService } from './auditoria.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  auditoria: {
    create: jest.fn(),
  },
};

describe('AuditoriaService', () => {
  let service: AuditoriaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuditoriaService>(AuditoriaService);
    jest.clearAllMocks();
  });

  it('should register an audit entry', async () => {
    mockPrismaService.auditoria.create.mockResolvedValue({});

    await service.registrar({
      usuarioId: 'uuid-1',
      accion: 'CREAR',
      modelo: 'usuarios',
      modeloId: 'uuid-new',
      ip: '127.0.0.1',
    });

    expect(mockPrismaService.auditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuarioId: 'uuid-1',
        accion: 'CREAR',
        modelo: 'usuarios',
        modeloId: 'uuid-new',
        ip: '127.0.0.1',
      }),
    });
  });

  it('should not throw when prisma fails', async () => {
    mockPrismaService.auditoria.create.mockRejectedValue(new Error('DB error'));

    await expect(
      service.registrar({
        accion: 'CREAR',
        modelo: 'usuarios',
      }),
    ).resolves.not.toThrow();
  });

  it('should handle null optional fields', async () => {
    mockPrismaService.auditoria.create.mockResolvedValue({});

    await service.registrar({
      accion: 'ELIMINAR',
      modelo: 'usuarios',
    });

    expect(mockPrismaService.auditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuarioId: null,
        accion: 'ELIMINAR',
        modelo: 'usuarios',
        modeloId: null,
        ip: null,
        userAgent: null,
      }),
    });
  });
});
