import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TipoCliente } from '@erp/shared';
import { ClientesService } from './clientes.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrismaService = {
  cliente: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  contactoCliente: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  equipoCliente: {
    findMany: jest.fn(),
  },
  ticket: {
    findMany: jest.fn(),
  },
};

describe('ClientesService', () => {
  let service: ClientesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ClientesService>(ClientesService);
    jest.resetAllMocks();
  });

  describe('create', () => {
    const createNaturalDto = {
      tipo: TipoCliente.NATURAL,
      nombre: 'Juan',
      apellido: 'Pérez',
      dni: '12345678',
    };

    const createEmpresaDto = {
      tipo: TipoCliente.EMPRESA,
      razonSocial: 'Empresa SAC',
      ruc: '20123456789',
    };

    it('should create a NATURAL client', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);
      mockPrismaService.cliente.create.mockResolvedValue({
        id: 'uuid-1',
        ...createNaturalDto,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createNaturalDto);
      expect(result.id).toBe('uuid-1');
      expect(result.tipo).toBe('NATURAL');
      expect(mockPrismaService.cliente.create).toHaveBeenCalled();
    });

    it('should create an EMPRESA client', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);
      mockPrismaService.cliente.create.mockResolvedValue({
        id: 'uuid-2',
        ...createEmpresaDto,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createEmpresaDto);
      expect(result.id).toBe('uuid-2');
      expect(result.tipo).toBe('EMPRESA');
    });

    it('should throw ConflictException for duplicate DNI', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createNaturalDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException for duplicate RUC', async () => {
      // createEmpresaDto has no dni, so only RUC findFirst is called
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce({
        id: 'existing',
      });

      await expect(service.create(createEmpresaDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException for invalid RUC prefix', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);

      const dto = { ...createEmpresaDto, ruc: '30123456789' };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should reserve DNI 00000000 for the system generic client', async () => {
      await expect(
        service.create({
          tipo: TipoCliente.NATURAL,
          nombre: 'Publico',
          apellido: 'General',
          dni: '00000000',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reactivate the system generic client when requested internally', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue({
        id: 'generic-1',
        dni: '00000000',
        esGenerico: true,
        deletedAt: new Date(),
      });
      mockPrismaService.cliente.update.mockResolvedValue({
        id: 'generic-1',
        dni: '00000000',
        esGenerico: true,
        activo: true,
        deletedAt: null,
      });

      const result = await service.create({
        tipo: TipoCliente.NATURAL,
        nombre: 'Público en General',
        dni: '00000000',
        esGenerico: true,
      });

      expect(result.id).toBe('generic-1');
      expect(mockPrismaService.cliente.update).toHaveBeenCalledWith({
        where: { id: 'generic-1' },
        data: expect.objectContaining({
          dni: '00000000',
          esGenerico: true,
          activo: true,
          deletedAt: null,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated clients', async () => {
      const clientes = [{ id: 'uuid-1', nombre: 'Test', tipo: 'NATURAL' }];
      mockPrismaService.cliente.findMany.mockResolvedValue(clientes);
      mockPrismaService.cliente.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by search term', async () => {
      mockPrismaService.cliente.findMany.mockResolvedValue([]);
      mockPrismaService.cliente.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, search: 'juan' });

      const call = mockPrismaService.cliente.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
      expect(call.where.OR).toHaveLength(7);
    });

    it('should filter by tipo', async () => {
      mockPrismaService.cliente.findMany.mockResolvedValue([]);
      mockPrismaService.cliente.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20, tipo: 'EMPRESA' as any });

      const call = mockPrismaService.cliente.findMany.mock.calls[0][0];
      expect(call.where.tipo).toBe('EMPRESA');
    });
  });

  describe('findOne', () => {
    it('should return a client with contactos', async () => {
      const cliente = { id: 'uuid-1', nombre: 'Test', contactos: [] };
      mockPrismaService.cliente.findFirst.mockResolvedValue(cliente);

      const result = await service.findOne('uuid-1');
      expect(result.id).toBe('uuid-1');
    });

    it('should throw NotFoundException for missing client', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue(null);

      await expect(service.findOne('uuid-missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a client', async () => {
      mockPrismaService.cliente.findFirst
        .mockResolvedValueOnce({
          id: 'uuid-1',
          tipo: TipoCliente.NATURAL,
          nombre: 'Juan',
          apellido: 'Pérez',
          dni: '12345678',
          contactos: [],
        })
        .mockResolvedValueOnce(null);
      mockPrismaService.cliente.update.mockResolvedValue({
        id: 'uuid-1',
        nombre: 'Updated',
      });

      const result = await service.update('uuid-1', { nombre: 'Updated' });
      expect(result.nombre).toBe('Updated');
    });

    it('should throw ConflictException for duplicate DNI on update', async () => {
      mockPrismaService.cliente.findFirst
        .mockResolvedValueOnce({
          id: 'uuid-1',
          tipo: TipoCliente.NATURAL,
          nombre: 'Juan',
          apellido: 'Pérez',
          dni: '12345678',
          contactos: [],
        })
        .mockResolvedValueOnce({ id: 'uuid-2' }); // duplicate DNI check

      await expect(
        service.update('uuid-1', { dni: '12345678' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid DNI format on update', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce({
        id: 'uuid-1',
        tipo: TipoCliente.NATURAL,
        nombre: 'Juan',
        apellido: 'Pérez',
        dni: '12345678',
        contactos: [],
      });

      await expect(service.update('uuid-1', { dni: '1234' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when switching to EMPRESA without required fields', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce({
        id: 'uuid-1',
        tipo: TipoCliente.NATURAL,
        nombre: 'Juan',
        apellido: 'Pérez',
        dni: '12345678',
        razonSocial: null,
        ruc: null,
        contactos: [],
      });

      await expect(
        service.update('uuid-1', { tipo: TipoCliente.EMPRESA }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid RUC format on update', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce({
        id: 'uuid-1',
        tipo: TipoCliente.EMPRESA,
        razonSocial: 'Empresa SAC',
        ruc: '20123456789',
        contactos: [],
      });

      await expect(
        service.update('uuid-1', { ruc: '30123456789' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject updates to the system generic client', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValueOnce({
        id: 'generic-1',
        tipo: TipoCliente.NATURAL,
        nombre: 'Público en General',
        dni: '00000000',
        esGenerico: true,
        contactos: [],
      });

      await expect(
        service.update('generic-1', { nombre: 'Otro nombre' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete a client', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue({
        id: 'uuid-1',
        contactos: [],
      });
      mockPrismaService.cliente.update.mockResolvedValue({});

      await service.remove('uuid-1');

      expect(mockPrismaService.cliente.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          activo: false,
        }),
      });
    });

    it('should reject removing the system generic client', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue({
        id: 'generic-1',
        dni: '00000000',
        esGenerico: true,
        contactos: [],
      });

      await expect(service.remove('generic-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.cliente.update).not.toHaveBeenCalled();
    });
  });

  describe('createContacto', () => {
    it('should create a CRM contact interaction', async () => {
      mockPrismaService.cliente.findFirst.mockResolvedValue({
        id: 'uuid-1',
        contactos: [],
      });
      mockPrismaService.contactoCliente.create.mockResolvedValue({
        id: 'contact-1',
        tipo: 'LLAMADA',
        descripcion: 'Consulta de precios',
      });

      const result = await service.createContacto(
        'uuid-1',
        {
          tipo: 'LLAMADA',
          descripcion: 'Consulta de precios',
        },
        'user-1',
      );

      expect(result.tipo).toBe('LLAMADA');
    });
  });
});
