import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { PrismaService } from '../../database/prisma.service';
import { UsuariosService } from '../usuarios/usuarios.service';

const mockUsuariosService = {
  changePassword: jest.fn(),
};

const mockEmailService = {
  getBrand: jest
    .fn()
    .mockResolvedValue({ nombre: 'Inventori', colorPrimario: '#D2691E' }),
  send: jest.fn().mockResolvedValue(true),
};

const mockPrismaService = {
  usuario: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  emailVerificationOtp: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  passwordResetToken: {
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsuariosService, useValue: mockUsuariosService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: string) => {
        if (key === 'FRONTEND_URL')
          return defaultValue ?? 'http://localhost:3000';
        if (key === 'JWT_REFRESH_SECRET') return 'reset-secret';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
        if (key === 'NODE_ENV') return 'development';
        return defaultValue;
      },
    );
    mockJwtService.sign.mockReturnValue('mock-access-token');
    mockPrismaService.passwordResetToken.updateMany.mockResolvedValue({
      count: 1,
    });
    mockPrismaService.passwordResetToken.findFirst.mockResolvedValue({
      id: 'reset-token-1',
      usuarioId: 'uuid-1',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      usuario: { activo: true, deletedAt: null },
    });
    mockPrismaService.passwordResetToken.create.mockResolvedValue({});
  });

  describe('login', () => {
    const loginDto = { email: 'admin@erp.local', password: 'Admin123!' };
    const mockUsuario = {
      id: 'uuid-1',
      nombre: 'Admin',
      apellido: 'Sistema',
      email: 'admin@erp.local',
      password: bcrypt.hashSync('Admin123!', 10),
      rol: 'ADMIN',
      activo: true,
      mustChangePassword: false,
      deletedAt: null,
    };

    it('should login successfully with valid credentials', async () => {
      mockPrismaService.usuario.findFirst.mockResolvedValue(mockUsuario);
      mockPrismaService.usuario.update.mockResolvedValue({ sessionVersion: 2 });
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('admin@erp.local');
      expect(result.user.rol).toBe('ADMIN');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrismaService.usuario.findFirst.mockResolvedValue({
        ...mockUsuario,
        activo: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrismaService.usuario.findFirst.mockResolvedValue(mockUsuario);

      await expect(
        service.login({ email: 'admin@erp.local', password: 'WrongPass!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      mockPrismaService.refreshToken.findFirst.mockResolvedValue({
        id: 'token-1',
        token: 'valid-refresh',
        usuario: {
          id: 'uuid-1',
          email: 'admin@erp.local',
          rol: 'ADMIN',
          activo: true,
          deletedAt: null,
          sessionVersion: 1,
        },
      });
      mockPrismaService.refreshToken.delete.mockResolvedValue({});
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('valid-refresh');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      // Old token should be deleted physically
      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockPrismaService.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      mockPrismaService.refreshToken.findFirst.mockResolvedValue({
        id: 'token-1',
        token: 'some-token',
      });
      mockPrismaService.refreshToken.delete.mockResolvedValue({});

      await service.logout('some-token');

      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      });
    });

    it('should not throw when token not found', async () => {
      mockPrismaService.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.logout('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('password reset', () => {
    it('should send a reset link and store a one-use token hash', async () => {
      mockPrismaService.usuario.findFirst.mockResolvedValue({
        id: 'uuid-1',
        nombre: 'Admin',
        email: 'admin@erp.local',
        activo: true,
      });
      mockJwtService.sign.mockReturnValue('reset-jwt');

      const result = await service.forgotPassword('admin@erp.local');

      expect(result.message).toContain('restablecer');
      expect(result.resetUrl).toBe(
        'http://localhost:3000/auth/reset-password?token=reset-jwt',
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'uuid-1',
          email: 'admin@erp.local',
          purpose: 'password-reset',
          jti: expect.any(String),
        }),
        expect.objectContaining({
          secret: 'reset-secret',
          expiresIn: '15m',
        }),
      );
      expect(
        mockPrismaService.passwordResetToken.updateMany,
      ).toHaveBeenCalledWith({
        where: { usuarioId: 'uuid-1', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(mockPrismaService.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          usuarioId: 'uuid-1',
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date),
        },
      });
      expect(mockEmailService.send).toHaveBeenCalled();
    });

    it('should consume the reset token before changing the password', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'uuid-1',
        email: 'admin@erp.local',
        purpose: 'password-reset',
        jti: 'token-id',
      });
      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue({
        id: 'reset-token-1',
        usuarioId: 'uuid-1',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usuario: { activo: true, deletedAt: null },
      });
      mockPrismaService.passwordResetToken.updateMany.mockResolvedValue({
        count: 1,
      });
      mockUsuariosService.changePassword.mockResolvedValue(undefined);

      const result = await service.resetPassword('reset-jwt', 'NewPass123!');

      expect(result.message).toContain('actualizada');
      expect(mockJwtService.verify).toHaveBeenCalledWith('reset-jwt', {
        secret: 'reset-secret',
      });
      expect(
        mockPrismaService.passwordResetToken.updateMany,
      ).toHaveBeenCalledWith({
        where: {
          id: 'reset-token-1',
          usedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        data: { usedAt: expect.any(Date) },
      });
      expect(mockUsuariosService.changePassword).toHaveBeenCalledWith(
        'uuid-1',
        {
          password: 'NewPass123!',
        },
      );
    });

    it('should reject an expired or already used reset token', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'uuid-1',
        email: 'admin@erp.local',
        purpose: 'password-reset',
        jti: 'token-id',
      });
      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue({
        id: 'reset-token-1',
        usuarioId: 'uuid-1',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        usuario: { activo: true, deletedAt: null },
      });
      mockPrismaService.passwordResetToken.updateMany.mockResolvedValue({
        count: 0,
      });

      await expect(
        service.resetPassword('reset-jwt', 'NewPass123!'),
      ).rejects.toThrow(BadRequestException);
      expect(mockUsuariosService.changePassword).not.toHaveBeenCalled();
    });

    it('should validate a fresh reset token', async () => {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      mockJwtService.verify.mockReturnValue({
        sub: 'uuid-1',
        email: 'admin@erp.local',
        purpose: 'password-reset',
        jti: 'token-id',
      });
      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue({
        id: 'reset-token-1',
        usuarioId: 'uuid-1',
        expiresAt,
        usuario: { activo: true, deletedAt: null },
      });

      const result = await service.validateResetPasswordToken('reset-jwt');

      expect(result).toEqual({
        valid: true,
        expiresAt: expiresAt.toISOString(),
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockProfile = {
        id: 'uuid-1',
        nombre: 'Admin',
        apellido: 'Sistema',
        email: 'admin@erp.local',
        rol: 'ADMIN',
        activo: true,
        mustChangePassword: false,
        ultimoAcceso: null,
        createdAt: new Date(),
      };
      mockPrismaService.usuario.findFirst.mockResolvedValue(mockProfile);

      const result = await service.getProfile('uuid-1');

      expect(result.email).toBe('admin@erp.local');
      expect(result.rol).toBe('ADMIN');
    });

    it('should throw UnauthorizedException for deleted user', async () => {
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);

      await expect(service.getProfile('uuid-deleted')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
