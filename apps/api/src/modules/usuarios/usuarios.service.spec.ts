import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { RolUsuario } from '@erp/shared';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../auth/email.service';
import { WhatsappService } from '../notifications/whatsapp.service';

const mockPrismaService = {
  usuario: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('http://localhost:3000'),
};

const mockEmailService = {
  getBrand: jest
    .fn()
    .mockResolvedValue({ nombre: 'Inventori', colorPrimario: '#D2691E' }),
  send: jest.fn().mockResolvedValue(true),
};

const mockWhatsappService = {
  isConfigured: jest.fn().mockReturnValue(false),
  normalize: jest.fn((p: string | null) => p),
  sendText: jest
    .fn()
    .mockResolvedValue({ delivered: true, provider: 'evolution' }),
};

describe('UsuariosService', () => {
  let service: UsuariosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: WhatsappService, useValue: mockWhatsappService },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan@erp.local',
      password: 'Password123!',
      rol: RolUsuario.TECNICO,
    };

    it('should create a user successfully', async () => {
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);
      mockPrismaService.usuario.create.mockResolvedValue({
        id: 'uuid-new',
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@erp.local',
        rol: 'TECNICO',
        activo: true,
        mustChangePassword: false,
        ultimoAcceso: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto);

      expect(result.email).toBe('juan@erp.local');
      // Verify password was hashed
      const createCall = mockPrismaService.usuario.create.mock.calls[0][0];
      expect(createCall.data.password).not.toBe('Password123!');
      expect(bcrypt.compareSync('Password123!', createCall.data.password)).toBe(
        true,
      );
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrismaService.usuario.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const mockUsuarios = [
        {
          id: 'uuid-1',
          nombre: 'Admin',
          apellido: 'Sistema',
          email: 'admin@erp.local',
          rol: 'ADMIN',
        },
      ];
      mockPrismaService.usuario.findMany.mockResolvedValue(mockUsuarios);
      mockPrismaService.usuario.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should filter by search term', async () => {
      mockPrismaService.usuario.findMany.mockResolvedValue([]);
      mockPrismaService.usuario.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, search: 'admin' });

      const findManyCall = mockPrismaService.usuario.findMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toHaveLength(3);
    });

    it('should filter by role', async () => {
      mockPrismaService.usuario.findMany.mockResolvedValue([]);
      mockPrismaService.usuario.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, rol: 'ADMIN' as any });

      const findManyCall = mockPrismaService.usuario.findMany.mock.calls[0][0];
      expect(findManyCall.where.rol).toBe('ADMIN');
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const mockUser = {
        id: 'uuid-1',
        nombre: 'Admin',
        email: 'admin@erp.local',
      };
      mockPrismaService.usuario.findFirst.mockResolvedValue(mockUser);

      const result = await service.findOne('uuid-1');

      expect(result.id).toBe('uuid-1');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      mockPrismaService.usuario.findFirst
        .mockResolvedValueOnce({ id: 'uuid-1' }) // findOne check
        .mockResolvedValueOnce(null); // email uniqueness check
      mockPrismaService.usuario.update.mockResolvedValue({
        id: 'uuid-1',
        nombre: 'Updated',
        email: 'updated@erp.local',
      });

      const result = await service.update('uuid-1', {
        nombre: 'Updated',
        email: 'updated@erp.local',
      });

      expect(result.nombre).toBe('Updated');
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrismaService.usuario.findFirst
        .mockResolvedValueOnce({ id: 'uuid-1' }) // findOne
        .mockResolvedValueOnce({ id: 'uuid-other' }); // email exists

      await expect(
        service.update('uuid-1', { email: 'taken@erp.local' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete a user', async () => {
      mockPrismaService.usuario.findFirst.mockResolvedValue({ id: 'uuid-1' });
      mockPrismaService.usuario.update.mockResolvedValue({});
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({});

      await service.remove('uuid-1');

      expect(mockPrismaService.usuario.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: expect.objectContaining({ activo: false }),
      });
      // Should delete all refresh tokens
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { usuarioId: 'uuid-1' },
      });
    });
  });

  describe('changePassword', () => {
    it('should hash password and revoke tokens', async () => {
      mockPrismaService.usuario.findFirst.mockResolvedValue({ id: 'uuid-1' });
      mockPrismaService.usuario.update.mockResolvedValue({});
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({});

      await service.changePassword('uuid-1', { password: 'NewPass123!' });

      const updateCall = mockPrismaService.usuario.update.mock.calls[0][0];
      expect(updateCall.data.mustChangePassword).toBe(false);
      expect(updateCall.data.sessionVersion).toEqual({ increment: 1 });
      expect(bcrypt.compareSync('NewPass123!', updateCall.data.password)).toBe(
        true,
      );
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { usuarioId: 'uuid-1' },
      });
    });
  });
});
