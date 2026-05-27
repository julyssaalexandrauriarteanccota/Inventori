import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EstadoComercialEquipo,
  EstadoContratoAlquiler,
  EstadoEquipo,
} from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { CajaService } from '../caja/caja.service';
import { AlquileresService } from './alquileres.service';

const mockPrismaService = {
  $transaction: jest.fn(),
  cliente: { findFirst: jest.fn() },
  equipo: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  contratoAlquiler: {
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  periodoAlquiler: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  lecturaAlquiler: { create: jest.fn() },
  cargoPeriodoAlquiler: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
  ticket: { findMany: jest.fn() },
  almacen: { findFirst: jest.fn() },
  almacenStock: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  movimientoStock: { create: jest.fn() },
  equipoCliente: {
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  garantia: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  adjunto: { create: jest.fn() },
  inspeccionAlquiler: { create: jest.fn() },
};

const mockCajaService = {
  getMiAperturaActiva: jest.fn(),
  registrarMovimiento: jest.fn(),
};

const cliente = {
  id: 'cliente-1',
  activo: true,
  nombre: 'Ada',
  apellido: 'Lovelace',
  razonSocial: null,
  dni: '12345678',
  ruc: null,
};

const equipo = {
  id: 'equipo-1',
  numeroSerie: 'SN-001',
  productoId: 'producto-1',
  almacenId: 'almacen-1',
  estado: EstadoEquipo.ACTIVO,
  estadoComercial: EstadoComercialEquipo.DISPONIBLE,
  contadorActual: 1000,
  producto: { id: 'producto-1', nombre: 'Multifuncional' },
};

const contratoActivo = {
  id: 'contrato-1',
  numero: 'ALQ-000001',
  clienteId: 'cliente-1',
  equipoId: 'equipo-1',
  creadoPorId: 'user-1',
  fechaInicio: new Date('2026-05-01T00:00:00.000Z'),
  fechaFinPrevista: new Date('2026-11-01T00:00:00.000Z'),
  mesesPlazo: 6,
  copiasIncluidasMes: 10000,
  precioMensual: 800,
  precioCopiaExcedente: 0.08,
  depositoGarantia: 400,
  depositoCobradoAt: null,
  depositoDevueltoAt: null,
  depositoAplicado: 0,
  contadorInicio: 1000,
  contadorActual: 1200,
  estado: EstadoContratoAlquiler.ACTIVO,
  notas: null,
  cliente,
  equipo,
};

describe('AlquileresService', () => {
  let service: AlquileresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlquileresService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CajaService, useValue: mockCajaService },
      ],
    }).compile();

    service = module.get(AlquileresService);
    jest.resetAllMocks();
    mockPrismaService.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrismaService) => unknown) =>
        callback(mockPrismaService),
    );
    mockPrismaService.cargoPeriodoAlquiler.findMany.mockResolvedValue([]);
    mockPrismaService.ticket.findMany.mockResolvedValue([]);
  });

  it('crea un contrato borrador usando el contador actual del equipo', async () => {
    mockPrismaService.cliente.findFirst.mockResolvedValue(cliente);
    mockPrismaService.equipo.findFirst.mockResolvedValue(equipo);
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue(null);
    mockPrismaService.contratoAlquiler.count.mockResolvedValue(0);
    mockPrismaService.contratoAlquiler.create.mockResolvedValue({
      id: 'contrato-1',
      numero: 'ALQ-000001',
      contadorInicio: 1000,
    });

    const result = await service.create(
      {
        clienteId: 'cliente-1',
        equipoId: 'equipo-1',
        fechaInicio: '2026-05-01',
        copiasIncluidasMes: 10000,
        precioMensual: 800,
        precioCopiaExcedente: 0.08,
      },
      'user-1',
    );

    expect(result.contadorInicio).toBe(1000);
    expect(mockPrismaService.contratoAlquiler.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          numero: 'ALQ-000001',
          contadorInicio: 1000,
          mesesPlazo: 6,
        }),
      }),
    );
  });

  it('no permite crear otro alquiler para un equipo con contrato abierto', async () => {
    mockPrismaService.cliente.findFirst.mockResolvedValue(cliente);
    mockPrismaService.equipo.findFirst.mockResolvedValue(equipo);
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue({
      id: 'contrato-2',
      numero: 'ALQ-000002',
    });

    await expect(
      service.create(
        {
          clienteId: 'cliente-1',
          equipoId: 'equipo-1',
          fechaInicio: '2026-05-01',
          copiasIncluidasMes: 10000,
          precioMensual: 800,
          precioCopiaExcedente: 0.08,
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza lectura manual menor al contador actual', async () => {
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue(
      contratoActivo,
    );
    mockPrismaService.periodoAlquiler.findFirst.mockResolvedValue({
      id: 'periodo-1',
      contratoId: 'contrato-1',
      estado: 'ACTIVO',
    });

    await expect(
      service.registrarLectura(
        'contrato-1',
        { contador: 1199, periodoId: 'periodo-1' },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('al activar crea el periodo 1 pendiente sin registrar cobros si no hay depósito', async () => {
    const contratoBorrador = {
      ...contratoActivo,
      estado: EstadoContratoAlquiler.BORRADOR,
      contadorActual: 1000,
      depositoGarantia: 0,
    };
    const periodo = {
      id: 'periodo-1',
      numeroPeriodo: 1,
      montoBase: 800,
    };

    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue(
      contratoBorrador,
    );
    mockPrismaService.equipo.findFirst.mockResolvedValue(equipo);
    mockPrismaService.almacenStock.findUnique.mockResolvedValue({
      cantidad: 1,
    });
    mockPrismaService.periodoAlquiler.create.mockResolvedValue(periodo);
    mockPrismaService.contratoAlquiler.findUnique.mockResolvedValue({
      ...contratoBorrador,
      estado: EstadoContratoAlquiler.ACTIVO,
    });

    await service.activar('contrato-1', {}, 'user-1');

    expect(mockPrismaService.periodoAlquiler.create).toHaveBeenCalledTimes(6);
    expect(mockPrismaService.periodoAlquiler.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          numeroPeriodo: 1,
          lecturaInicial: 1000,
          estado: 'PENDIENTE_BASE',
        }),
      }),
    );
    expect(mockPrismaService.periodoAlquiler.create).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({
        data: expect.objectContaining({
          numeroPeriodo: 6,
          lecturaInicial: null,
          estado: 'PENDIENTE_BASE',
        }),
      }),
    );
    expect(mockCajaService.getMiAperturaActiva).not.toHaveBeenCalled();
    expect(mockCajaService.registrarMovimiento).not.toHaveBeenCalled();
    expect(mockPrismaService.adjunto.create).not.toHaveBeenCalled();
    expect(mockPrismaService.contratoAlquiler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'ACTIVO',
        }),
      }),
    );
  });

  it('al activar cobra el depósito y registra evidencia si corresponde', async () => {
    const contratoBorrador = {
      ...contratoActivo,
      estado: EstadoContratoAlquiler.BORRADOR,
      contadorActual: 1000,
      depositoGarantia: 400,
      depositoCobradoAt: null,
    };
    const periodo = {
      id: 'periodo-1',
      numeroPeriodo: 1,
      montoBase: 800,
    };

    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue(
      contratoBorrador,
    );
    mockPrismaService.equipo.findFirst.mockResolvedValue(equipo);
    mockPrismaService.almacenStock.findUnique.mockResolvedValue({
      cantidad: 1,
    });
    mockPrismaService.periodoAlquiler.create.mockResolvedValue(periodo);
    mockCajaService.getMiAperturaActiva.mockResolvedValue({ id: 'apertura-1' });
    mockCajaService.registrarMovimiento.mockResolvedValue({
      id: 'mov-deposito-1',
    });
    mockPrismaService.contratoAlquiler.findUnique.mockResolvedValue({
      ...contratoBorrador,
      estado: EstadoContratoAlquiler.ACTIVO,
    });

    await service.activar(
      'contrato-1',
      {
        metodoPagoId: 'metodo-yape',
        referenciaPago: 'OP-123',
        evidenciaPagoFilename: 'deposito.jpg',
      },
      'user-1',
    );

    expect(mockCajaService.registrarMovimiento).toHaveBeenCalledWith(
      'apertura-1',
      'user-1',
      expect.objectContaining({
        tipo: 'DEPOSITO',
        monto: 400,
        referenciaTipo: 'ALQUILER_DEPOSITO',
        referenciaId: 'contrato-1',
      }),
      mockPrismaService,
    );
    expect(mockPrismaService.adjunto.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entidad: 'ALQUILER_PAGO',
        entidadId: 'mov-deposito-1',
        nombre: 'deposito.jpg',
      }),
    });
    expect(mockPrismaService.contratoAlquiler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'ACTIVO',
          depositoCobradoAt: expect.any(Date),
        }),
      }),
    );
    expect(mockPrismaService.inspeccionAlquiler.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipo: 'ENTREGA',
        condicion: 'BUENO',
        contador: 1000,
      }),
    });
  });

  it('rechaza cierre con lectura final menor a la inicial', async () => {
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue(
      contratoActivo,
    );
    mockPrismaService.periodoAlquiler.findFirst.mockResolvedValue({
      id: 'periodo-1',
      contratoId: 'contrato-1',
      estado: 'ACTIVO',
      lecturaInicial: 1200,
      copiasIncluidas: 10000,
      cargos: [],
    });

    await expect(
      service.cerrarPeriodo(
        'contrato-1',
        'periodo-1',
        { lecturaFinal: 1199 },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no permite cobrar dos veces un cierre de periodo', async () => {
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue(
      contratoActivo,
    );
    mockPrismaService.periodoAlquiler.findFirst.mockResolvedValue({
      id: 'periodo-1',
      contratoId: 'contrato-1',
      numeroPeriodo: 1,
      estado: 'CERRADO',
      totalCierre: 120,
      cierreCobradoAt: new Date(),
    });

    await expect(
      service.cobrarCierre('contrato-1', 'periodo-1', {}, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cierra la lectura sin excedente y sin registrar cobro adicional', async () => {
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue(
      contratoActivo,
    );
    mockPrismaService.periodoAlquiler.findFirst.mockResolvedValue({
      id: 'periodo-1',
      contratoId: 'contrato-1',
      numeroPeriodo: 1,
      estado: 'ACTIVO',
      fechaInicio: new Date('2026-05-01T00:00:00.000Z'),
      fechaFin: new Date('2026-06-01T00:00:00.000Z'),
      lecturaInicial: 1000,
      copiasIncluidas: 10000,
      totalCierre: 0,
      cierreCobradoAt: null,
      cargos: [],
    });
    mockPrismaService.contratoAlquiler.findUnique.mockResolvedValue(
      contratoActivo,
    );

    await service.cerrarPeriodo(
      'contrato-1',
      'periodo-1',
      { lecturaFinal: 1400 },
      'user-1',
    );

    expect(mockCajaService.getMiAperturaActiva).not.toHaveBeenCalled();
    expect(mockCajaService.registrarMovimiento).not.toHaveBeenCalled();
    expect(mockPrismaService.ticket.findMany).not.toHaveBeenCalled();
    expect(mockPrismaService.periodoAlquiler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'periodo-1' },
        data: expect.objectContaining({
          estado: 'CERRADO',
          montoSoporte: 0,
          totalCierre: 0,
          cierreCobradoAt: expect.any(Date),
        }),
      }),
    );
  });

  it('cierra un excedente legacy en cero sin pedir caja ni método de pago', async () => {
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue(
      contratoActivo,
    );
    mockPrismaService.periodoAlquiler.findFirst.mockResolvedValue({
      id: 'periodo-1',
      contratoId: 'contrato-1',
      numeroPeriodo: 1,
      estado: 'PENDIENTE_CIERRE',
      totalCierre: 0,
      cierreCobradoAt: null,
    });
    mockPrismaService.contratoAlquiler.findUnique.mockResolvedValue(
      contratoActivo,
    );

    await service.cobrarCierre('contrato-1', 'periodo-1', {}, 'user-1');

    expect(mockCajaService.getMiAperturaActiva).not.toHaveBeenCalled();
    expect(mockCajaService.registrarMovimiento).not.toHaveBeenCalled();
    expect(mockPrismaService.periodoAlquiler.update).toHaveBeenCalledWith({
      where: { id: 'periodo-1' },
      data: { estado: 'CERRADO', cierreCobradoAt: expect.any(Date) },
    });
  });

  it('cobra explícitamente la mensualidad base de un periodo pendiente', async () => {
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue(
      contratoActivo,
    );
    mockPrismaService.periodoAlquiler.findFirst
      .mockResolvedValueOnce({
        id: 'periodo-2',
        contratoId: 'contrato-1',
        numeroPeriodo: 2,
        estado: 'PENDIENTE_BASE',
        montoBase: 800,
        baseCobradoAt: null,
        lecturaInicial: null,
      })
      .mockResolvedValueOnce({ estado: 'CERRADO' })
      .mockResolvedValueOnce({ lecturaFinal: 1400 });
    mockCajaService.getMiAperturaActiva.mockResolvedValue({ id: 'apertura-1' });
    mockCajaService.registrarMovimiento.mockResolvedValue({ id: 'mov-base-2' });
    mockPrismaService.contratoAlquiler.findUnique.mockResolvedValue(
      contratoActivo,
    );

    await service.cobrarBase(
      'contrato-1',
      'periodo-2',
      { metodoPagoId: 'metodo-efectivo' },
      'user-1',
    );

    expect(mockCajaService.registrarMovimiento).toHaveBeenCalledWith(
      'apertura-1',
      'user-1',
      expect.objectContaining({
        monto: 800,
        referenciaTipo: 'ALQUILER_PERIODO',
        referenciaId: 'periodo-2',
      }),
      mockPrismaService,
    );
    expect(mockPrismaService.periodoAlquiler.update).toHaveBeenCalledWith({
      where: { id: 'periodo-2' },
      data: expect.objectContaining({
        estado: 'ACTIVO',
        baseCobradoAt: expect.any(Date),
        lecturaInicial: 1400,
      }),
    });
  });

  it('no cobra el depósito junto con la primera mensualidad', async () => {
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue({
      ...contratoActivo,
      depositoCobradoAt: null,
    });
    mockPrismaService.periodoAlquiler.findFirst.mockResolvedValueOnce({
      id: 'periodo-1',
      contratoId: 'contrato-1',
      numeroPeriodo: 1,
      estado: 'PENDIENTE_BASE',
      montoBase: 800,
      baseCobradoAt: null,
      lecturaInicial: 1000,
    });
    mockCajaService.getMiAperturaActiva.mockResolvedValue({ id: 'apertura-1' });
    mockCajaService.registrarMovimiento.mockResolvedValueOnce({
      id: 'mov-base-1',
    });
    mockPrismaService.contratoAlquiler.findUnique.mockResolvedValue(
      contratoActivo,
    );

    await service.cobrarBase(
      'contrato-1',
      'periodo-1',
      { metodoPagoId: 'metodo-efectivo' },
      'user-1',
    );

    expect(mockCajaService.registrarMovimiento).toHaveBeenNthCalledWith(
      1,
      'apertura-1',
      'user-1',
      expect.objectContaining({
        monto: 800,
        referenciaTipo: 'ALQUILER_PERIODO',
        referenciaId: 'periodo-1',
      }),
      mockPrismaService,
    );
    expect(mockCajaService.registrarMovimiento).toHaveBeenCalledTimes(1);
    expect(mockPrismaService.contratoAlquiler.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'contrato-1' },
        data: expect.objectContaining({ depositoCobradoAt: expect.any(Date) }),
      }),
    );
  });

  it('finaliza un periodo activo sin excedente ni cobros adicionales', async () => {
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue(
      contratoActivo,
    );
    mockPrismaService.almacen.findFirst.mockResolvedValue({ id: 'almacen-1' });
    mockPrismaService.periodoAlquiler.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'periodo-1',
        contratoId: 'contrato-1',
        numeroPeriodo: 1,
        estado: 'ACTIVO',
        fechaInicio: new Date('2026-05-01T00:00:00.000Z'),
        fechaFin: new Date('2026-06-01T00:00:00.000Z'),
        lecturaInicial: 1000,
        copiasIncluidas: 10000,
        totalCierre: 0,
        cargos: [],
      });
    mockPrismaService.almacenStock.findUnique.mockResolvedValue({
      cantidad: 0,
    });
    mockPrismaService.contratoAlquiler.findUnique.mockResolvedValue({
      ...contratoActivo,
      estado: 'CERRADO',
    });

    await service.finalizar(
      'contrato-1',
      {
        almacenId: 'almacen-1',
      },
      'user-1',
    );

    expect(
      mockPrismaService.cargoPeriodoAlquiler.create,
    ).not.toHaveBeenCalled();
    expect(mockPrismaService.inspeccionAlquiler.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipo: 'RETORNO',
        condicion: 'BUENO',
        contador: 1200,
      }),
    });
    expect(mockPrismaService.contratoAlquiler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'CERRADO',
          contadorActual: 1200,
        }),
      }),
    );
  });

  it('rechaza finalizar si queda una mensualidad base pendiente', async () => {
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue(
      contratoActivo,
    );
    mockPrismaService.almacen.findFirst.mockResolvedValue({ id: 'almacen-1' });
    mockPrismaService.periodoAlquiler.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ numeroPeriodo: 2 });

    await expect(
      service.finalizar(
        'contrato-1',
        {
          almacenId: 'almacen-1',
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrismaService.contratoAlquiler.update).not.toHaveBeenCalled();
  });

  it('registra cargos finales y aplica depósito al finalizar', async () => {
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue({
      ...contratoActivo,
      depositoCobradoAt: new Date('2026-05-01T00:00:00.000Z'),
      depositoAplicado: 0,
    });
    mockPrismaService.almacen.findFirst.mockResolvedValue({ id: 'almacen-1' });
    mockPrismaService.periodoAlquiler.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'periodo-1',
        contratoId: 'contrato-1',
        numeroPeriodo: 1,
        estado: 'CERRADO',
        fechaInicio: new Date('2026-05-01T00:00:00.000Z'),
        fechaFin: new Date('2026-06-01T00:00:00.000Z'),
        lecturaInicial: 1000,
        lecturaFinal: 1200,
        totalCierre: 0,
        cargos: [],
      });
    mockPrismaService.almacenStock.findUnique.mockResolvedValue({
      cantidad: 0,
    });
    mockPrismaService.contratoAlquiler.findUnique.mockResolvedValue({
      ...contratoActivo,
      estado: 'EN_RETORNO',
    });

    await service.finalizar(
      'contrato-1',
      {
        almacenId: 'almacen-1',
        cargoDanos: 100,
        depositoAplicado: 50,
        condicionRetorno: 'DANADO' as any,
        evidenciaRetornoFilename: 'retorno.jpg',
        notasInspeccion: 'Golpe en tapa lateral',
      },
      'user-1',
    );

    expect(mockPrismaService.cargoPeriodoAlquiler.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        periodoId: 'periodo-1',
        tipo: 'DANO',
        monto: 100,
      }),
    });
    expect(mockPrismaService.periodoAlquiler.update).toHaveBeenCalledWith({
      where: { id: 'periodo-1' },
      data: expect.objectContaining({
        totalCierre: 100,
        estado: 'PENDIENTE_CIERRE',
      }),
    });
    expect(mockPrismaService.inspeccionAlquiler.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipo: 'RETORNO',
        condicion: 'DANADO',
        evidenciaFilename: 'retorno.jpg',
        notas: 'Golpe en tapa lateral',
      }),
    });
    expect(mockPrismaService.contratoAlquiler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'EN_RETORNO',
          depositoAplicado: 50,
        }),
      }),
    );
  });

  it('devuelve depósito por caja al cerrar sin cargos pendientes', async () => {
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue({
      ...contratoActivo,
      depositoCobradoAt: new Date('2026-05-01T00:00:00.000Z'),
      depositoAplicado: 0,
    });
    mockPrismaService.almacen.findFirst.mockResolvedValue({ id: 'almacen-1' });
    mockPrismaService.periodoAlquiler.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'periodo-1',
        contratoId: 'contrato-1',
        numeroPeriodo: 1,
        estado: 'CERRADO',
        fechaInicio: new Date('2026-05-01T00:00:00.000Z'),
        fechaFin: new Date('2026-06-01T00:00:00.000Z'),
        lecturaInicial: 1000,
        lecturaFinal: 1200,
        totalCierre: 0,
        cargos: [],
      });
    mockPrismaService.almacenStock.findUnique.mockResolvedValue({
      cantidad: 0,
    });
    mockCajaService.getMiAperturaActiva.mockResolvedValue({ id: 'apertura-1' });
    mockCajaService.registrarMovimiento.mockResolvedValue({ id: 'mov-dev-1' });
    mockPrismaService.contratoAlquiler.findUnique.mockResolvedValue({
      ...contratoActivo,
      estado: 'CERRADO',
    });

    await service.finalizar(
      'contrato-1',
      {
        almacenId: 'almacen-1',
        depositoDevuelto: 400,
        metodoPagoDevolucionId: 'metodo-efectivo',
      },
      'user-1',
    );

    expect(mockCajaService.registrarMovimiento).toHaveBeenCalledWith(
      'apertura-1',
      'user-1',
      expect.objectContaining({
        tipo: 'DEVOLUCION',
        monto: 400,
        referenciaTipo: 'ALQUILER_DEVOLUCION_DEPOSITO',
        referenciaId: 'contrato-1',
      }),
      mockPrismaService,
    );
    expect(mockPrismaService.contratoAlquiler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'CERRADO',
          depositoDevueltoAt: expect.any(Date),
        }),
      }),
    );
  });

  it('finaliza como CERRADO cuando no queda saldo pendiente', async () => {
    mockPrismaService.contratoAlquiler.findFirst.mockResolvedValue({
      ...contratoActivo,
      contadorActual: 51994,
    });
    mockPrismaService.almacen.findFirst.mockResolvedValue({ id: 'almacen-1' });
    mockPrismaService.periodoAlquiler.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'periodo-6',
        contratoId: 'contrato-1',
        numeroPeriodo: 6,
        estado: 'CERRADO',
        fechaInicio: new Date('2026-10-01T00:00:00.000Z'),
        fechaFin: new Date('2026-11-01T00:00:00.000Z'),
        lecturaInicial: 31000,
        lecturaFinal: 51994,
        totalCierre: 0,
        cargos: [],
      });
    mockPrismaService.almacenStock.findUnique.mockResolvedValue({
      cantidad: 0,
    });
    mockPrismaService.contratoAlquiler.findUnique.mockResolvedValue({
      ...contratoActivo,
      estado: 'CERRADO',
    });

    await service.finalizar(
      'contrato-1',
      {
        almacenId: 'almacen-1',
      },
      'user-1',
    );

    expect(mockPrismaService.contratoAlquiler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'CERRADO',
          contadorActual: 51994,
        }),
      }),
    );
    expect(mockPrismaService.garantia.updateMany).toHaveBeenCalledWith({
      where: { contratoAlquilerId: 'contrato-1', estado: 'ACTIVA' },
      data: { estado: 'VENCIDA', fechaFin: expect.any(Date) },
    });
  });
});
