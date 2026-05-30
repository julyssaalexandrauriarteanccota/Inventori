import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SoporteService } from './soporte.service';
import { PrismaService } from '../../database/prisma.service';
import { EventsService } from '../../websockets/events.service';
import { InventarioService } from '../inventario/inventario.service';
import { WhatsappService } from '../notifications/whatsapp.service';
import {
  EstadoTicket,
  EstadoGarantia,
  RolUsuario,
  TipoMovimiento,
  TipoProducto,
} from '@erp/shared';

describe('SoporteService', () => {
  let service: SoporteService;

  const mockTx = {
    ticket: {
      update: jest.fn(),
      delete: jest.fn(),
    },
    historialTicket: {
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    detalleTicket: {
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    adjuntoTicket: {
      deleteMany: jest.fn(),
    },
    casoGarantia: {
      deleteMany: jest.fn(),
    },
    movimientoStock: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    almacenStock: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPrisma = {
    cliente: {
      findFirst: jest.fn(),
    },
    equipo: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    equipoClienteActivo: {
      findFirst: jest.fn(),
    },
    usuario: {
      findFirst: jest.fn(),
    },
    ticket: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    historialTicket: {
      create: jest.fn(),
    },
    garantia: {
      findMany: jest.fn(),
    },
    adjuntoTicket: {
      create: jest.fn(),
    },
    producto: {
      findFirst: jest.fn(),
    },
    compatibilidad: {
      findUnique: jest.fn(),
    },
    almacen: {
      findFirst: jest.fn(),
    },
    almacenStock: {
      findUnique: jest.fn(),
    },
    detalleTicket: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockTx)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoporteService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: InventarioService,
          useValue: {
            ensurePrincipalAlmacen: jest.fn().mockResolvedValue({
              id: 'almacen-uuid',
              nombre: 'Almacén Principal',
              esPrincipal: true,
              activo: true,
              deletedAt: null,
            }),
          },
        },
        {
          provide: EventsService,
          useValue: {
            emitToUser: jest.fn(),
            emitToRole: jest.fn(),
            emitToRoles: jest.fn(),
            emitToAll: jest.fn(),
          },
        },
        {
          provide: WhatsappService,
          useValue: {
            isConfigured: jest.fn().mockReturnValue(false),
            normalize: jest.fn((p: string | null) => p),
            sendText: jest
              .fn()
              .mockResolvedValue({ delivered: true, provider: 'evolution' }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    }).compile();

    service = module.get<SoporteService>(SoporteService);
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════

  describe('create', () => {
    const dto = {
      clienteId: 'client-uuid',
      titulo: 'Impresora no enciende',
      descripcion: 'El equipo no enciende al presionar el botón',
    };

    it('debe crear un ticket con código TKT-YYYY-XXXX', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({ id: 'client-uuid' });
      mockPrisma.ticket.findFirst.mockResolvedValue(null); // para generarCodigo
      mockPrisma.ticket.create.mockResolvedValue({
        id: 'ticket-uuid',
        codigo: `TKT-${new Date().getFullYear()}-0001`,
        ...dto,
        estado: EstadoTicket.ABIERTO,
      });
      mockPrisma.historialTicket.create.mockResolvedValue({});

      const result = await service.create(
        dto as any,
        'user-uuid',
        RolUsuario.ADMIN,
      );

      expect(result.data.codigo).toMatch(/^TKT-\d{4}-\d{4}$/);
      expect(mockPrisma.historialTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            campo: 'estado',
            valorDespues: EstadoTicket.ABIERTO,
          }),
        }),
      );
    });

    it('debe lanzar NotFoundException si el cliente no existe', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue(null);

      await expect(
        service.create(dto as any, 'user-uuid', RolUsuario.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar NotFoundException si el equipo no existe', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({ id: 'client-uuid' });
      mockPrisma.equipo.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          { ...dto, equipoId: 'equipo-fake' } as any,
          'user-uuid',
          RolUsuario.ADMIN,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar NotFoundException si el técnico no existe', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({ id: 'client-uuid' });
      mockPrisma.usuario.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          { ...dto, tecnicoId: 'tec-fake' } as any,
          'user-uuid',
          RolUsuario.ADMIN,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe generar código correlativo correcto', async () => {
      const year = new Date().getFullYear();
      mockPrisma.cliente.findFirst.mockResolvedValue({ id: 'client-uuid' });
      mockPrisma.ticket.findFirst.mockResolvedValueOnce({
        codigo: `TKT-${year}-0042`,
      }); // generarCodigo
      mockPrisma.ticket.create.mockResolvedValue({
        id: 'ticket-uuid',
        codigo: `TKT-${year}-0043`,
        ...dto,
      });
      mockPrisma.historialTicket.create.mockResolvedValue({});

      const result = await service.create(
        dto as any,
        'user-uuid',
        RolUsuario.ADMIN,
      );

      expect(result.data.codigo).toBe(`TKT-${year}-0043`);
    });
  });

  // ═══════════════════════════════════════════
  //  FIND ALL
  // ═══════════════════════════════════════════

  describe('findAll', () => {
    it('debe listar tickets paginados', async () => {
      const tickets = [{ id: '1', codigo: 'TKT-2026-0001' }];
      mockPrisma.ticket.findMany.mockResolvedValue(tickets);
      mockPrisma.ticket.count.mockResolvedValue(1);

      const result = await service.findAll(
        {} as any,
        'user-uuid',
        RolUsuario.ADMIN,
      );

      expect(result.data).toEqual(tickets);
      expect(result.meta.total).toBe(1);
    });

    it('TECNICO solo ve sus tickets asignados', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);

      await service.findAll({} as any, 'tec-uuid', RolUsuario.TECNICO);

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tecnicoId: 'tec-uuid' }),
        }),
      );
    });

    it('debe filtrar por estado y prioridad', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);

      await service.findAll(
        { estado: EstadoTicket.ABIERTO, prioridad: 'ALTA' } as any,
        'user-uuid',
        RolUsuario.ADMIN,
      );

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: EstadoTicket.ABIERTO,
            prioridad: 'ALTA',
          }),
        }),
      );
    });

    it('debe buscar por texto en código, título o cliente', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);

      await service.findAll(
        { search: 'TKT-2026' } as any,
        'user-uuid',
        RolUsuario.ADMIN,
      );

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                codigo: { contains: 'TKT-2026', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════
  //  FIND ONE
  // ═══════════════════════════════════════════

  describe('findOne', () => {
    it('debe obtener un ticket por ID', async () => {
      const ticket = { id: 'ticket-uuid', tecnicoId: 'tec-uuid' };
      mockPrisma.ticket.findFirst.mockResolvedValue(ticket);

      const result = await service.findOne(
        'ticket-uuid',
        'admin-uuid',
        RolUsuario.ADMIN,
      );

      expect(result.data).toEqual({ ...ticket, garantiaActual: null });
    });

    it('debe incluir garantía actual del equipo propio aunque no tenga casos', async () => {
      const ticket = {
        id: 'ticket-uuid',
        tecnicoId: 'tec-uuid',
        equipoId: 'equipo-uuid',
        casosGarantia: [],
      };
      const garantia = {
        id: 'garantia-uuid',
        codigoQR: 'qr-uuid',
        fechaInicio: new Date('2026-05-24T00:00:00.000Z'),
        fechaFin: new Date('2027-05-24T00:00:00.000Z'),
        cobertura: 'Garantía estándar de fábrica — 12 meses',
        exclusiones: null,
        estado: EstadoGarantia.PENDIENTE_COMPLETAR,
      };
      mockPrisma.ticket.findFirst.mockResolvedValue(ticket);
      mockPrisma.garantia.findMany.mockResolvedValue([garantia]);

      const result = await service.findOne(
        'ticket-uuid',
        'admin-uuid',
        RolUsuario.ADMIN,
      );

      expect(result.data.casos).toEqual([]);
      expect(result.data.garantiaActual).toEqual({
        ...garantia,
        vigente: false,
      });
      expect(mockPrisma.garantia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ equipoId: 'equipo-uuid' }),
        }),
      );
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('fake-uuid', 'user-uuid', RolUsuario.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('TECNICO no puede ver ticket de otro técnico', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        tecnicoId: 'otro-tec',
      });

      await expect(
        service.findOne('ticket-uuid', 'mi-tec-uuid', RolUsuario.TECNICO),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════

  describe('update', () => {
    it('debe actualizar ticket y registrar historial', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        codigo: 'TKT-2026-0001',
        estado: EstadoTicket.ABIERTO,
        prioridad: 'MEDIA',
        tecnicoId: 'tec-uuid',
        detalles: [],
      });
      mockTx.ticket.update.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.EN_PROCESO,
      });
      mockTx.historialTicket.createMany.mockResolvedValue({ count: 1 });

      const result = await service.update(
        'ticket-uuid',
        { estado: EstadoTicket.EN_PROCESO } as any,
        'user-uuid',
        RolUsuario.ADMIN,
      );

      expect(result.data.estado).toBe(EstadoTicket.EN_PROCESO);
      expect(mockTx.historialTicket.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            campo: 'estado',
            valorAntes: EstadoTicket.ABIERTO,
            valorDespues: EstadoTicket.EN_PROCESO,
          }),
        ]),
      });
    });

    it('debe devolver stock al cancelar un ticket con repuestos consumidos', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        codigo: 'TKT-2026-0001',
        estado: EstadoTicket.EN_PROCESO,
        prioridad: 'MEDIA',
        tecnicoId: 'tec-uuid',
        detalles: [
          {
            productoId: 'prod-uuid',
            cantidad: 2,
            producto: { tipo: TipoProducto.REPUESTO },
          },
        ],
      });
      mockTx.ticket.update.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.CANCELADO,
      });
      mockTx.movimientoStock.findMany.mockResolvedValue([
        {
          productoId: 'prod-uuid',
          almacenOrigenId: 'almacen-uuid',
          cantidad: 2,
          costoUnitario: 50,
        },
      ]);
      mockTx.almacenStock.update.mockResolvedValue({});
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 5 });
      mockTx.historialTicket.createMany.mockResolvedValue({ count: 1 });

      await service.update(
        'ticket-uuid',
        { estado: EstadoTicket.CANCELADO } as any,
        'user-uuid',
        RolUsuario.ADMIN,
      );

      expect(mockTx.almacenStock.update).toHaveBeenCalledWith({
        where: {
          almacenId_productoId: {
            almacenId: 'almacen-uuid',
            productoId: 'prod-uuid',
          },
        },
        data: { cantidad: { increment: 2 } },
      });
      expect(mockTx.movimientoStock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo: TipoMovimiento.AJUSTE_POSITIVO,
          productoId: 'prod-uuid',
          almacenDestinoId: 'almacen-uuid',
          cantidad: 2,
          cantidadAnterior: 3,
          cantidadPosterior: 5,
          justificacion: 'Anulación ticket TKT-2026-0001',
        }),
      });
    });

    it('no puede modificar ticket cerrado', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.CERRADO,
      });

      await expect(
        service.update(
          'ticket-uuid',
          { titulo: 'nuevo' } as any,
          'user-uuid',
          RolUsuario.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('TECNICO no puede modificar ticket de otro', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.ABIERTO,
        tecnicoId: 'otro-tec',
      });

      await expect(
        service.update(
          'ticket-uuid',
          {} as any,
          'mi-tec-uuid',
          RolUsuario.TECNICO,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar NotFoundException si ticket no existe', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      await expect(
        service.update('fake-uuid', {} as any, 'user-uuid', RolUsuario.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════
  //  ADD REPUESTO
  // ═══════════════════════════════════════════

  describe('addRepuesto', () => {
    const dto = {
      productoId: 'prod-uuid',
      cantidad: 2,
      precioUnitario: 50,
    };

    it('debe agregar repuesto, crear movimiento CONSUMO_SOPORTE y actualizar stock', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        codigo: 'TKT-2026-0001',
        estado: EstadoTicket.EN_PROCESO,
        equipo: { productoId: 'modelo-uuid' },
        detalles: [
          {
            producto: {
              tipo: TipoProducto.SERVICIO,
              requiereRepuestos: true,
            },
          },
        ],
      });
      mockPrisma.producto.findFirst.mockResolvedValue({
        id: 'prod-uuid',
        precioVenta: 50,
        tipo: TipoProducto.REPUESTO,
      });
      mockPrisma.compatibilidad.findUnique.mockResolvedValue({
        id: 'compat-uuid',
      });
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 1 });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 8 });

      mockTx.detalleTicket.create.mockResolvedValue({
        id: 'detalle-uuid',
        productoId: 'prod-uuid',
        cantidad: 2,
        producto: { id: 'prod-uuid', nombre: 'Toner', sku: 'TN-123' },
      });
      mockTx.movimientoStock.create.mockResolvedValue({});
      mockTx.historialTicket.create.mockResolvedValue({});

      const result = await service.addRepuesto(
        'ticket-uuid',
        dto as any,
        'user-uuid',
      );

      expect(result.data.productoId).toBe('prod-uuid');
      expect(mockTx.movimientoStock.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipo: TipoMovimiento.CONSUMO_SOPORTE,
          cantidad: 2,
          cantidadAnterior: 10,
          cantidadPosterior: 8,
          justificacion: 'Consumo soporte TKT-2026-0001: 2x Toner',
        }),
      });
      expect(mockTx.almacenStock.updateMany).toHaveBeenCalledWith({
        where: {
          almacenId: 'almacen-uuid',
          productoId: 'prod-uuid',
          cantidad: { gte: 2 },
        },
        data: { cantidad: { decrement: 2 } },
      });
    });

    it('debe marcar el ticket abierto como EN_PROCESO al consumir repuesto', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        codigo: 'TKT-2026-0001',
        estado: EstadoTicket.ABIERTO,
        equipo: null,
        detalles: [
          {
            producto: {
              tipo: TipoProducto.SERVICIO,
              requiereRepuestos: true,
            },
          },
        ],
      });
      mockPrisma.producto.findFirst.mockResolvedValue({
        id: 'prod-uuid',
        precioVenta: 50,
        tipo: TipoProducto.REPUESTO,
        modelosCompatibles: [],
      });
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 1 });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 8 });
      mockTx.detalleTicket.create.mockResolvedValue({
        id: 'detalle-uuid',
        productoId: 'prod-uuid',
        cantidad: 2,
        producto: { id: 'prod-uuid', nombre: 'Toner', sku: 'TN-123' },
      });
      mockTx.movimientoStock.create.mockResolvedValue({});
      mockTx.historialTicket.create.mockResolvedValue({});
      mockTx.ticket.update.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.EN_PROCESO,
      });

      await service.addRepuesto('ticket-uuid', dto as any, 'user-uuid');

      expect(mockTx.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-uuid' },
        data: { estado: EstadoTicket.EN_PROCESO },
      });
      expect(mockTx.historialTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ticketId: 'ticket-uuid',
          campo: 'estado',
          valorAntes: EstadoTicket.ABIERTO,
          valorDespues: EstadoTicket.EN_PROCESO,
          notas: 'Ticket marcado en proceso por consumo de repuesto',
        }),
      });
    });

    it('debe rechazar repuesto si el ticket no tiene un servicio que requiera repuestos', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.EN_PROCESO,
        equipo: null,
        detalles: [
          {
            producto: {
              tipo: TipoProducto.SERVICIO,
              requiereRepuestos: false,
            },
          },
        ],
      });
      mockPrisma.producto.findFirst.mockResolvedValue({
        id: 'prod-uuid',
        tipo: TipoProducto.REPUESTO,
      });

      await expect(
        service.addRepuesto('ticket-uuid', dto as any, 'user-uuid'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.almacen.findFirst).not.toHaveBeenCalled();
    });

    it('debe rechazar repuesto incompatible con el modelo del equipo', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.EN_PROCESO,
        equipo: { productoId: 'modelo-uuid' },
        detalles: [
          {
            producto: {
              tipo: TipoProducto.SERVICIO,
              requiereRepuestos: true,
            },
          },
        ],
      });
      mockPrisma.producto.findFirst.mockResolvedValue({
        id: 'prod-uuid',
        tipo: TipoProducto.REPUESTO,
      });
      mockPrisma.compatibilidad.findUnique.mockResolvedValue(null);

      await expect(
        service.addRepuesto('ticket-uuid', dto as any, 'user-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe validar repuesto con modelos compatibles de catálogo', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.EN_PROCESO,
        equipo: {
          productoId: 'equipo-producto-uuid',
          producto: { modeloCatalogoId: 'modelo-catalogo-uuid' },
        },
        detalles: [
          {
            producto: {
              tipo: TipoProducto.SERVICIO,
              requiereRepuestos: true,
            },
          },
        ],
      });
      mockPrisma.producto.findFirst.mockResolvedValue({
        id: 'prod-uuid',
        precioVenta: 50,
        tipo: TipoProducto.REPUESTO,
        modelosCompatibles: [{ modeloCatalogoId: 'modelo-catalogo-uuid' }],
      });
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 1 });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 8 });
      mockTx.detalleTicket.create.mockResolvedValue({
        id: 'detalle-uuid',
        productoId: 'prod-uuid',
        cantidad: 2,
        producto: { id: 'prod-uuid', nombre: 'Toner', sku: 'TN-123' },
      });
      mockTx.movimientoStock.create.mockResolvedValue({});
      mockTx.historialTicket.create.mockResolvedValue({});

      await service.addRepuesto('ticket-uuid', dto as any, 'user-uuid');

      expect(mockPrisma.compatibilidad.findUnique).not.toHaveBeenCalled();
      expect(mockTx.detalleTicket.create).toHaveBeenCalled();
    });

    it('debe rechazar si stock insuficiente', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.EN_PROCESO,
        equipo: null,
        detalles: [
          {
            producto: {
              tipo: TipoProducto.SERVICIO,
              requiereRepuestos: true,
            },
          },
        ],
      });
      mockPrisma.producto.findFirst.mockResolvedValue({
        id: 'prod-uuid',
        tipo: TipoProducto.REPUESTO,
      });
      mockTx.almacenStock.updateMany.mockResolvedValue({ count: 0 });
      mockTx.almacenStock.findUnique.mockResolvedValue({ cantidad: 1 });

      await expect(
        service.addRepuesto('ticket-uuid', dto as any, 'user-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('no permite agregar repuesto a ticket cerrado', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.CERRADO,
      });

      await expect(
        service.addRepuesto('ticket-uuid', dto as any, 'user-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si producto no existe', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.EN_PROCESO,
        equipo: null,
      });
      mockPrisma.producto.findFirst.mockResolvedValue(null);

      await expect(
        service.addRepuesto('ticket-uuid', dto as any, 'user-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════
  //  ADD ADJUNTO
  // ═══════════════════════════════════════════

  describe('addAdjunto', () => {
    it('debe agregar adjunto y registrar historial', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        codigo: 'TKT-2026-0001',
        tecnicoId: 'user-uuid',
      });
      mockPrisma.adjuntoTicket.create.mockResolvedValue({
        id: 'adj-uuid',
        url: 'file.jpg',
        nombre: 'foto.jpg',
      });
      mockPrisma.historialTicket.create.mockResolvedValue({});

      const result = await service.addAdjunto(
        'ticket-uuid',
        {
          url: 'file.jpg',
          nombre: 'foto.jpg',
          tipo: 'image/jpeg',
          tamano: 1024,
        },
        'user-uuid',
      );

      expect(result.data.url).toBe('file.jpg');
      expect(mockPrisma.historialTicket.create).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si ticket no existe', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      await expect(
        service.addAdjunto(
          'fake-uuid',
          { url: 'f', nombre: 'f', tipo: 'image/jpeg' },
          'user-uuid',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════
  //  UPDATE DETALLE
  // ═══════════════════════════════════════════

  describe('updateDetalle', () => {
    it('debe impedir cambiar cantidad de un repuesto ya consumido', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.EN_PROCESO,
        tecnicoId: 'tec-uuid',
      });
      mockPrisma.detalleTicket.findFirst.mockResolvedValue({
        id: 'detalle-uuid',
        ticketId: 'ticket-uuid',
        productoId: 'prod-uuid',
        cantidad: 1,
        producto: { tipo: TipoProducto.REPUESTO },
      });

      await expect(
        service.updateDetalle(
          'ticket-uuid',
          'detalle-uuid',
          { cantidad: 2 } as any,
          'user-uuid',
          RolUsuario.ADMIN,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.detalleTicket.update).not.toHaveBeenCalled();
    });

    it('debe permitir cambiar cantidad de una línea de servicio', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.EN_PROCESO,
        tecnicoId: 'tec-uuid',
      });
      mockPrisma.detalleTicket.findFirst.mockResolvedValue({
        id: 'detalle-uuid',
        ticketId: 'ticket-uuid',
        productoId: 'serv-uuid',
        cantidad: 1,
        producto: { tipo: TipoProducto.SERVICIO },
      });
      mockPrisma.detalleTicket.update.mockResolvedValue({
        id: 'detalle-uuid',
        cantidad: 2,
      });

      const result = await service.updateDetalle(
        'ticket-uuid',
        'detalle-uuid',
        { cantidad: 2 } as any,
        'user-uuid',
        RolUsuario.ADMIN,
      );

      expect(result.data.cantidad).toBe(2);
      expect(mockPrisma.detalleTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cantidad: 2 }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════
  //  CERRAR
  // ═══════════════════════════════════════════

  describe('cerrar', () => {
    it('debe cerrar ticket y calcular montoTotal', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        codigo: 'TKT-2026-0001',
        estado: EstadoTicket.EN_PROCESO,
        tecnicoId: 'tec-uuid',
        detalles: [
          {
            precioUnitario: 100,
            cantidad: 1,
            cubiertoGarantia: false,
            producto: { tipo: TipoProducto.SERVICIO },
          },
          {
            precioUnitario: 50,
            cantidad: 2,
            cubiertoGarantia: false,
            producto: { tipo: TipoProducto.REPUESTO },
          },
          {
            precioUnitario: 30,
            cantidad: 1,
            cubiertoGarantia: false,
            producto: { tipo: TipoProducto.REPUESTO },
          },
        ],
      });

      mockTx.ticket.update.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.CERRADO,
        montoTotal: 230,
      });
      mockTx.historialTicket.create.mockResolvedValue({});

      const result = await service.cerrar(
        'ticket-uuid',
        {},
        'tec-uuid',
        RolUsuario.TECNICO,
      );

      expect(result.data.estado).toBe(EstadoTicket.CERRADO);
      expect(mockTx.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: EstadoTicket.CERRADO,
            montoTotal: 230,
            montoRepuestos: 130,
            montoManoObra: 100,
          }),
        }),
      );
    });

    it('no debe cerrar un ticket ya cerrado', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.CERRADO,
        detalles: [],
      });

      await expect(
        service.cerrar('ticket-uuid', {}, 'user-uuid', RolUsuario.ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('no debe cerrar un ticket cancelado', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.CANCELADO,
        detalles: [],
      });

      await expect(
        service.cerrar('ticket-uuid', {}, 'user-uuid', RolUsuario.ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('TECNICO no puede cerrar ticket de otro', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.EN_PROCESO,
        tecnicoId: 'otro-tec',
        detalles: [],
      });

      await expect(
        service.cerrar('ticket-uuid', {}, 'mi-tec-uuid', RolUsuario.TECNICO),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe aceptar montoManoObra desde DTO de cierre', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        estado: EstadoTicket.EN_PROCESO,
        tecnicoId: 'tec-uuid',
        montoManoObra: 0,
        detalles: [],
      });
      mockTx.ticket.update.mockResolvedValue({
        estado: EstadoTicket.CERRADO,
        montoTotal: 150,
      });
      mockTx.historialTicket.create.mockResolvedValue({});

      await service.cerrar(
        'ticket-uuid',
        { montoManoObra: 150 },
        'tec-uuid',
        RolUsuario.TECNICO,
      );

      expect(mockTx.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            montoManoObra: 150,
            montoTotal: 150,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════
  //  FIND BY CÓDIGO (PÚBLICO)
  // ═══════════════════════════════════════════

  describe('findByCodigo', () => {
    it('debe devolver ticket con datos públicos', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        codigo: 'TKT-2026-0001',
        titulo: 'Falla impresora',
        estado: EstadoTicket.EN_PROCESO,
        historial: [],
      });

      const result = await service.findByCodigo('TKT-2026-0001');

      expect(result.data.codigo).toBe('TKT-2026-0001');
      expect(result.data.estado).toBe(EstadoTicket.EN_PROCESO);
    });

    it('debe lanzar NotFoundException si código no existe', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      await expect(service.findByCodigo('TKT-0000-0000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════
  //  REMOVE
  // ═══════════════════════════════════════════

  describe('remove', () => {
    it('debe eliminar definitivamente un ticket', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        codigo: 'TKT-2026-0001',
        estado: EstadoTicket.CERRADO,
        tecnicoId: 'tec-uuid',
        detalles: [],
      });
      mockTx.adjuntoTicket.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.casoGarantia.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.historialTicket.deleteMany.mockResolvedValue({ count: 1 });
      mockTx.detalleTicket.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.ticket.delete.mockResolvedValue({});

      const result = await service.remove(
        'ticket-uuid',
        'admin-uuid',
        RolUsuario.ADMIN,
      );

      expect(result.data.message).toContain('TKT-2026-0001');
      expect(mockTx.ticket.delete).toHaveBeenCalledWith({
        where: { id: 'ticket-uuid' },
      });
    });

    it('debe eliminar un ticket activo sin revertir repuestos consumidos', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        codigo: 'TKT-2026-0001',
        estado: EstadoTicket.EN_PROCESO,
        tecnicoId: 'tec-uuid',
        detalles: [
          {
            productoId: 'prod-uuid',
            cantidad: 1,
            producto: { tipo: TipoProducto.REPUESTO },
          },
        ],
      });
      mockTx.adjuntoTicket.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.casoGarantia.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.historialTicket.deleteMany.mockResolvedValue({ count: 1 });
      mockTx.detalleTicket.deleteMany.mockResolvedValue({ count: 1 });
      mockTx.ticket.delete.mockResolvedValue({});

      await service.remove('ticket-uuid', 'admin-uuid', RolUsuario.ADMIN);

      expect(mockTx.movimientoStock.findMany).not.toHaveBeenCalled();
      expect(mockTx.almacenStock.update).not.toHaveBeenCalled();
      expect(mockTx.movimientoStock.create).not.toHaveBeenCalled();
      expect(mockTx.ticket.delete).toHaveBeenCalledWith({
        where: { id: 'ticket-uuid' },
      });
    });

    it('TECNICO no puede eliminar ticket de otro técnico', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue({
        id: 'ticket-uuid',
        codigo: 'TKT-2026-0001',
        estado: EstadoTicket.ABIERTO,
        tecnicoId: 'otro-tec-uuid',
      });

      await expect(
        service.remove('ticket-uuid', 'mi-tec-uuid', RolUsuario.TECNICO),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockPrisma.ticket.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('fake-uuid', 'admin-uuid', RolUsuario.ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
