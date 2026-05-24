import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { FacturacionService } from './facturacion.service';
import { PrismaService } from '../../database/prisma.service';
import {
  AmbienteSunat,
  TipoDocumento,
  EstadoVenta,
  EstadoComprobante,
  EstadoComunicacionBaja,
  EstadoFacturacionVenta,
  TipoAfectacionIgv,
  TipoFiscalProducto,
} from '@erp/shared';
import { ComprobanteDetalleService } from './comprobante-detalle.service';
import { ComprobanteSnapshotService } from './comprobante-snapshot.service';
import { SerieDocumentoService } from './serie-documento.service';
import { SunatDirectGateway } from './sunat-direct.gateway';

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockSunatGateway = {
  getStatusCdr: jest.fn(),
  getStatus: jest.fn(),
};

const mockStorage = {
  writeObject: jest.fn().mockResolvedValue(undefined),
  readObjectText: jest.fn().mockResolvedValue(null),
  readObjectBuffer: jest.fn().mockResolvedValue(null),
  buildComprobanteStorageKey: jest.fn(
    (
      c: {
        emisorRuc?: string;
        serie: string;
        correlativo: number;
        tipo?: unknown;
      },
      ext: string,
    ) => {
      const tipoMap: Record<string, string> = {
        FACTURA: '01',
        BOLETA: '03',
        NOTA_CREDITO: '07',
        NOTA_DEBITO: '08',
      };
      const tipo = tipoMap[String(c.tipo)] ?? '00';
      const correlativo = String(c.correlativo).padStart(8, '0');
      return `sunat/${c.emisorRuc ?? 'sin-ruc'}/${tipo}/${c.serie}-${correlativo}.${ext}`;
    },
  ),
  buildBajaStorageKey: jest.fn(
    (b: { identificadorBaja: string }, ext: string) =>
      `sunat/bajas/${b.identificadorBaja}.${ext === 'cdr' ? 'cdr.zip' : 'xml'}`,
  ),
  putXml: jest.fn().mockResolvedValue('xml-key'),
  putCdrZip: jest.fn().mockResolvedValue('cdr-key'),
  putPdf: jest.fn().mockResolvedValue('pdf-key'),
};

const mockTx = {
  configEmpresa: { findFirst: jest.fn(), update: jest.fn() },
  configEmpresaFiscal: { findFirst: jest.fn() },
  comprobante: { create: jest.fn(), update: jest.fn() },
  comprobanteDetalle: { createMany: jest.fn() },
  comprobanteEnvioLog: { create: jest.fn() },
  comunicacionBaja: { create: jest.fn() },
  serieDocumento: { findFirst: jest.fn(), update: jest.fn() },
  serieDocumentoBaja: { upsert: jest.fn() },
  venta: { update: jest.fn() },
  notaCredito: { create: jest.fn() },
  notaDebito: { create: jest.fn() },
  $queryRaw: jest.fn(),
};

const mockPrisma = {
  venta: { findUnique: jest.fn(), update: jest.fn() },
  comprobante: {
    findUnique: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _sum: { total: 0 } }),
  },
  feriadoNacional: { findMany: jest.fn().mockResolvedValue([]) },
  notaCredito: { create: jest.fn() },
  notaDebito: { create: jest.fn() },
  configEmpresa: { findFirst: jest.fn(), update: jest.fn() },
  configEmpresaFiscal: { findFirst: jest.fn() },
  comunicacionBaja: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  comprobanteEnvioLog: { create: jest.fn() },
  certificadoDigital: { findFirst: jest.fn() },
  $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<unknown>) =>
    fn(mockTx),
  ),
};

describe('FacturacionService', () => {
  let service: FacturacionService;

  const mockConfig = {
    id: 'config-1',
    razonSocial: 'EMPRESA SAC',
    ruc: '20123456789',
    direccion: 'Av. Test 123',
    serieFactura: 'F001',
    serieBoleta: 'B001',
    serieNotaCredito: 'FC01',
    serieNotaDebito: 'FD01',
    correlativoFactura: 5,
    correlativoBoleta: 10,
    correlativoNotaCredito: 2,
    correlativoNotaDebito: 1,
    porcentajeIGV: 18.0,
  };

  const mockCliente = {
    id: 'cli-1',
    nombre: 'Juan',
    apellido: 'Pérez',
    razonSocial: 'EMPRESA CLIENTE SAC',
    ruc: '20987654326',
    dni: '12345678',
    direccion: 'Av. Cliente 456',
  };

  const mockVenta = {
    id: 'venta-1',
    codigo: 'V-0001',
    estado: EstadoVenta.ORDEN_CONFIRMADA,
    estadoFacturacion: EstadoFacturacionVenta.SIN_COMPROBANTE,
    subtotal: 1000.0,
    igv: 180.0,
    total: 1180.0,
    clienteId: 'cli-1',
    cliente: mockCliente,
    detalles: [
      {
        id: 'det-1',
        productoId: 'prod-1',
        cantidad: 2,
        precioUnitario: 590.0,
        subtotal: 1000.0,
        producto: {
          id: 'prod-1',
          sku: 'EQP-001',
          nombre: 'Equipo portátil empresarial',
          descripcion: null,
          tipo: 'EQUIPO',
          unidadMedida: { codigo: 'NIU' },
        },
      },
    ],
  };

  const mockComprobante = {
    id: 'comp-1',
    ventaId: 'venta-1',
    tipo: TipoDocumento.FACTURA,
    serie: 'F001',
    correlativo: 6,
    numero: 'F001-00000006',
    clienteNombre: 'EMPRESA CLIENTE SAC',
    clienteDocTipo: '6',
    clienteDocNum: '20987654321',
    subtotal: 1000.0,
    igv: 180.0,
    total: 1180.0,
    estado: EstadoComprobante.PENDIENTE_ENVIO,
    fechaEmision: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTx.serieDocumento.findFirst.mockResolvedValue(null);
    mockTx.$queryRaw.mockImplementation(
      async (strings: TemplateStringsArray) => {
        const sql = Array.from(strings).join(' ');
        if (sql.includes('FROM series_documento')) {
          const serie = await mockTx.serieDocumento.findFirst();
          return serie ? [serie] : [];
        }
        if (sql.includes('FROM config_empresa')) {
          const config = await mockTx.configEmpresa.findFirst();
          return config ? [config] : [];
        }
        return [];
      },
    );
    mockTx.serieDocumentoBaja.upsert.mockResolvedValue({
      correlativoActual: 1,
    });
    mockTx.configEmpresaFiscal.findFirst.mockResolvedValue(null);
    mockPrisma.configEmpresaFiscal.findFirst.mockResolvedValue(null);
    mockPrisma.comunicacionBaja.findFirst.mockResolvedValue(null);
    mockTx.comprobanteDetalle.createMany.mockResolvedValue({ count: 1 });
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'SUNAT_ENVIRONMENT') return AmbienteSunat.BETA;
      return undefined;
    });

    mockPrisma.$transaction = jest.fn(
      (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    );

    const mockPdfService = {
      render: jest.fn().mockResolvedValue(Buffer.from('pdf-stub')),
    };
    const mockEmailService = {
      enviarComprobanteAceptado: jest.fn().mockResolvedValue(undefined),
    };
    // Doc 10 §7 — el servicio de validación se mockea para no acoplar los
    // tests de emisión a las reglas. Pruebas dedicadas viven en
    // validacion-fiscal.service.spec.ts. Por defecto, "todo válido".
    const mockValidacionFiscal = {
      validar: jest
        .fn()
        .mockResolvedValue({ bloqueantes: [], advertencias: [] }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacturacionService,
        ComprobanteDetalleService,
        ComprobanteSnapshotService,
        SerieDocumentoService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SunatDirectGateway, useValue: mockSunatGateway },
        { provide: getQueueToken('cola-envio-cpe'), useValue: mockQueue },
        { provide: getQueueToken('cola-baja'), useValue: mockQueue },
        {
          provide: (await import('./fiscal-storage.service'))
            .FiscalStorageService,
          useValue: mockStorage,
        },
        {
          provide: (await import('./comprobante-pdf.service'))
            .ComprobantePdfService,
          useValue: mockPdfService,
        },
        {
          provide: (await import('./comprobante-email.service'))
            .ComprobanteEmailService,
          useValue: mockEmailService,
        },
        {
          provide: (await import('./validacion-fiscal.service'))
            .ValidacionFiscalService,
          useValue: mockValidacionFiscal,
        },
      ],
    }).compile();

    service = module.get<FacturacionService>(FacturacionService);
  });

  describe('emitirComprobante', () => {
    it('debe emitir factura para venta ORDEN_CONFIRMADA', async () => {
      mockPrisma.venta.findUnique.mockResolvedValue(mockVenta);
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);
      mockTx.configEmpresa.findFirst.mockResolvedValue(mockConfig);
      mockTx.configEmpresa.update.mockResolvedValue({
        ...mockConfig,
        correlativoFactura: 6,
      });
      mockTx.comprobante.create.mockResolvedValue(mockComprobante);
      mockTx.venta.update.mockResolvedValue({
        ...mockVenta,
        estadoFacturacion: EstadoFacturacionVenta.EN_EMISION,
      });

      const result = await service.emitirComprobante({
        ventaId: 'venta-1',
        tipo: TipoDocumento.FACTURA,
      });

      expect(result).toEqual(mockComprobante);
      expect(mockTx.configEmpresa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { correlativoFactura: 6 },
        }),
      );
      expect(mockTx.venta.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { estadoFacturacion: EstadoFacturacionVenta.EN_EMISION },
        }),
      );
      expect(mockTx.comprobante.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 1000,
            igv: 180,
            total: 1180,
            emisorRuc: '20123456789',
            emisorRazonSocial: 'EMPRESA SAC',
            emisorDireccionFiscal: 'Av. Test 123',
          }),
        }),
      );
      expect(mockTx.comprobanteDetalle.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            comprobanteId: 'comp-1',
            item: 1,
            codigoInterno: 'EQP-001',
            descripcion: 'Equipo portátil empresarial',
            unidadSunat: 'NIU',
            tipoFiscalProducto: TipoFiscalProducto.BIEN,
            tipoAfectacionIgv: TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
            baseImponible: 1000,
            igv: 180,
            total: 1180,
          }),
        ],
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'enviar-comprobante',
        expect.objectContaining({ comprobanteId: 'comp-1' }),
        expect.objectContaining({ attempts: 4 }),
      );
    });

    // Doc 06 §4 — reconciliación IGV global ↔ suma por línea.
    //
    // Caso clásico de descuadre por redondeo: 5 unidades de un consumible barato
    // a S/ 1.00 cada una (precio de venta con IGV; base S/ 0.85).
    //
    //  Antes del fix (Forma A — recálculo global sobre subtotal):
    //    Comprobante.igv = round(4.25 × 0.18) = round(0.765) = 0.77
    //  Después del fix (Forma B — Σ de líneas):
    //    cada línea.igv = round(1.00 - 0.85) = 0.15
    //    Σ por línea = 5 × 0.15 = 0.75
    //
    // SUNAT exige que cbc:TaxAmount global (Comprobante.igv) ≈ Σ TaxAmount por
    // línea (ComprobanteDetalle.igv). Una diferencia ≥ 0.02 puede ser rechazada
    // con código 2335. El test garantiza que `Comprobante.igv` se calcula como
    // suma de líneas y nunca diverge del XML.
    it('reconcilia Comprobante.igv con Σ ComprobanteDetalle.igv (caso 5× S/ 0.85)', async () => {
      const ventaCentavos = {
        ...mockVenta,
        subtotal: 4.25, // intencionalmente incorrecto: el código nuevo NO debe usarlo
        igv: 0.77, // intencionalmente incorrecto (recálculo global)
        total: 5.02,
        detalles: Array.from({ length: 5 }, (_, idx) => ({
          id: `det-${idx + 1}`,
          productoId: 'prod-cheap',
          cantidad: 1,
          precioUnitario: 1,
          descuento: 0,
          subtotal: 0.85,
          producto: {
            id: 'prod-cheap',
            sku: 'CON-001',
            nombre: 'Consumible barato',
            descripcion: null,
            tipo: 'INSUMO',
            unidadMedida: { codigo: 'NIU' },
          },
        })),
      };

      mockPrisma.venta.findUnique.mockResolvedValue(ventaCentavos);
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);
      mockTx.configEmpresa.findFirst.mockResolvedValue(mockConfig);
      mockTx.configEmpresa.update.mockResolvedValue({
        ...mockConfig,
        correlativoBoleta: 11,
      });
      mockTx.comprobante.create.mockResolvedValue({
        ...mockComprobante,
        tipo: TipoDocumento.BOLETA,
        serie: 'B001',
        correlativo: 11,
        numero: 'B001-00000011',
        subtotal: 4.25,
        igv: 0.75,
        total: 5.0,
      });
      mockTx.venta.update.mockResolvedValue({
        ...ventaCentavos,
        estadoFacturacion: EstadoFacturacionVenta.EN_EMISION,
      });

      await service.emitirComprobante({
        ventaId: 'venta-1',
        tipo: TipoDocumento.BOLETA,
      });

      // El Comprobante guardado debe tener IGV = 0.75 (Σ líneas), NO 0.77.
      expect(mockTx.comprobante.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 4.25,
            igv: 0.75,
            total: 5.0,
          }),
        }),
      );

      // Y cada ComprobanteDetalle debe sumar exactamente 0.75 en IGV.
      const detalleCall =
        mockTx.comprobanteDetalle.createMany.mock.calls[0]?.[0];
      expect(detalleCall).toBeDefined();
      const detallesGuardados = (
        detalleCall as {
          data: Array<{ igv: number; baseImponible: number; total: number }>;
        }
      ).data;
      expect(detallesGuardados).toHaveLength(5);
      const sumaIgvLineas = +detallesGuardados
        .reduce((acc, d) => acc + Number(d.igv), 0)
        .toFixed(2);
      expect(sumaIgvLineas).toBe(0.75);
      // Y cada línea debe tener exactamente 0.15 (no 0.153).
      detallesGuardados.forEach((d) => {
        expect(Number(d.igv)).toBe(0.15);
        expect(Number(d.baseImponible)).toBe(0.85);
        expect(Number(d.total)).toBe(1.0);
      });
    });

    it('debe usar configuración fiscal para snapshot de emisor cuando existe', async () => {
      mockPrisma.venta.findUnique.mockResolvedValue(mockVenta);
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);
      mockTx.configEmpresa.findFirst.mockResolvedValue(mockConfig);
      mockTx.configEmpresaFiscal.findFirst.mockResolvedValue({
        ruc: '20999999999',
        razonSocial: 'EMPRESA FISCAL SAC',
        nombreComercial: 'Fiscal Demo',
        direccionFiscal: 'Av. Fiscal 456',
        ubigeoFiscal: '150101',
        codigoEstablecimiento: '0001',
      });
      mockTx.configEmpresa.update.mockResolvedValue({
        ...mockConfig,
        correlativoFactura: 6,
      });
      mockTx.comprobante.create.mockResolvedValue(mockComprobante);
      mockTx.venta.update.mockResolvedValue({
        ...mockVenta,
        estadoFacturacion: EstadoFacturacionVenta.EN_EMISION,
      });

      await service.emitirComprobante({
        ventaId: 'venta-1',
        tipo: TipoDocumento.FACTURA,
      });

      expect(mockTx.comprobante.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emisorRuc: '20999999999',
            emisorRazonSocial: 'EMPRESA FISCAL SAC',
            emisorNombreComercial: 'Fiscal Demo',
            emisorDireccionFiscal: 'Av. Fiscal 456',
            emisorUbigeoFiscal: '150101',
            emisorCodigoEstablecimiento: '0001',
          }),
        }),
      );
    });

    it('debe usar SerieDocumento cuando existe configuración de series nueva', async () => {
      mockPrisma.venta.findUnique.mockResolvedValue(mockVenta);
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);
      mockTx.configEmpresa.findFirst.mockResolvedValue(mockConfig);
      mockTx.serieDocumento.findFirst.mockResolvedValue({
        id: 'serie-1',
        tipo: TipoDocumento.FACTURA,
        serie: 'F010',
        correlativoActual: 41,
      });
      mockTx.serieDocumento.update.mockResolvedValue({});
      mockTx.comprobante.create.mockResolvedValue({
        ...mockComprobante,
        serie: 'F010',
        correlativo: 42,
        numero: 'F010-00000042',
      });
      mockTx.venta.update.mockResolvedValue({
        ...mockVenta,
        estadoFacturacion: EstadoFacturacionVenta.EN_EMISION,
      });

      const result = await service.emitirComprobante({
        ventaId: 'venta-1',
        tipo: TipoDocumento.FACTURA,
      });

      expect(result.numero).toBe('F010-00000042');
      expect(mockTx.serieDocumento.update).toHaveBeenCalledWith({
        where: { id: 'serie-1' },
        data: { correlativoActual: 42 },
      });
      expect(mockTx.configEmpresa.update).not.toHaveBeenCalled();
    });

    it('debe emitir boleta incrementando correlativo correcto', async () => {
      const ventaBoleta = {
        ...mockVenta,
        cliente: { ...mockCliente, ruc: null },
      };
      mockPrisma.venta.findUnique.mockResolvedValue(ventaBoleta);
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);
      mockTx.configEmpresa.findFirst.mockResolvedValue(mockConfig);
      mockTx.configEmpresa.update.mockResolvedValue({
        ...mockConfig,
        correlativoBoleta: 11,
      });
      mockTx.comprobante.create.mockResolvedValue({
        ...mockComprobante,
        tipo: TipoDocumento.BOLETA,
        serie: 'B001',
        numero: 'B001-00000011',
      });
      mockTx.venta.update.mockResolvedValue({
        ...mockVenta,
        estadoFacturacion: EstadoFacturacionVenta.EN_EMISION,
      });

      const result = await service.emitirComprobante({
        ventaId: 'venta-1',
        tipo: TipoDocumento.BOLETA,
      });

      expect(result.tipo).toBe(TipoDocumento.BOLETA);
      expect(mockTx.configEmpresa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { correlativoBoleta: 11 },
        }),
      );
    });

    it('debe rechazar si la venta no existe', async () => {
      mockPrisma.venta.findUnique.mockResolvedValue(null);

      await expect(
        service.emitirComprobante({
          ventaId: 'no-existe',
          tipo: TipoDocumento.FACTURA,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar si la venta está en estado COTIZACION', async () => {
      mockPrisma.venta.findUnique.mockResolvedValue({
        ...mockVenta,
        estado: EstadoVenta.COTIZACION,
      });

      await expect(
        service.emitirComprobante({
          ventaId: 'venta-1',
          tipo: TipoDocumento.FACTURA,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si la venta ya tiene comprobante', async () => {
      mockPrisma.venta.findUnique.mockResolvedValue(mockVenta);
      mockPrisma.comprobante.findUnique.mockResolvedValue(mockComprobante);

      await expect(
        service.emitirComprobante({
          ventaId: 'venta-1',
          tipo: TipoDocumento.FACTURA,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe rechazar factura si el cliente no tiene RUC', async () => {
      mockPrisma.venta.findUnique.mockResolvedValue({
        ...mockVenta,
        cliente: { ...mockCliente, ruc: null },
      });
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);

      await expect(
        service.emitirComprobante({
          ventaId: 'venta-1',
          tipo: TipoDocumento.FACTURA,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar factura si el RUC no pasa validación SUNAT', async () => {
      mockPrisma.venta.findUnique.mockResolvedValue({
        ...mockVenta,
        cliente: { ...mockCliente, ruc: '20987654321' },
      });
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);

      await expect(
        service.emitirComprobante({
          ventaId: 'venta-1',
          tipo: TipoDocumento.FACTURA,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si no hay configuración de empresa', async () => {
      mockPrisma.venta.findUnique.mockResolvedValue(mockVenta);
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);
      mockTx.configEmpresa.findFirst.mockResolvedValue(null);

      await expect(
        service.emitirComprobante({
          ventaId: 'venta-1',
          tipo: TipoDocumento.FACTURA,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar tipos distintos de FACTURA y BOLETA', async () => {
      await expect(
        service.emitirComprobante({
          ventaId: 'venta-1',
          tipo: TipoDocumento.NOTA_CREDITO,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('debe listar comprobantes paginados', async () => {
      mockPrisma.comprobante.findMany.mockResolvedValue([mockComprobante]);
      mockPrisma.comprobante.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('debe filtrar por tipo', async () => {
      mockPrisma.comprobante.findMany.mockResolvedValue([]);
      mockPrisma.comprobante.count.mockResolvedValue(0);

      await service.findAll({ tipo: TipoDocumento.FACTURA });

      expect(mockPrisma.comprobante.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tipo: TipoDocumento.FACTURA }),
        }),
      );
    });

    it('debe filtrar por estado', async () => {
      mockPrisma.comprobante.findMany.mockResolvedValue([]);
      mockPrisma.comprobante.count.mockResolvedValue(0);

      await service.findAll({ estado: EstadoComprobante.ACEPTADO });

      expect(mockPrisma.comprobante.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: EstadoComprobante.ACEPTADO,
          }),
        }),
      );
    });

    it('debe buscar por texto', async () => {
      mockPrisma.comprobante.findMany.mockResolvedValue([]);
      mockPrisma.comprobante.count.mockResolvedValue(0);

      await service.findAll({ search: 'F001' });

      expect(mockPrisma.comprobante.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ numero: expect.anything() }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('debe retornar comprobante con detalle', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue({
        ...mockComprobante,
        venta: { id: 'venta-1', codigo: 'V-0001', clienteId: 'cli-1' },
        notasCredito: [],
        notasDebito: [],
      });

      const result = await service.findOne('comp-1');

      expect(result.id).toBe('comp-1');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);

      await expect(service.findOne('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDocumentoSoporte', () => {
    it('debe retornar hash, xml y cdr del comprobante', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue({
        id: 'comp-1',
        numero: 'F001-00000006',
        estado: EstadoComprobante.ACEPTADO,
        hashSunat: 'HASH-123',
        hashCpe: 'HASH-CPE-123',
        xmlStorageKey: 'sunat/20123456789/01/F001-00000006.xml',
        cdrStorageKey: 'sunat/20123456789/01/F001-00000006.cdr',
        pdfStorageKey: null,
      });

      const result = await service.getDocumentoSoporte('comp-1');

      expect(result.hashSunat).toBe('HASH-123');
      expect(result.hashCpe).toBe('HASH-CPE-123');
      expect(result.xmlUrl).toBe('sunat/20123456789/01/F001-00000006.xml');
      expect(result.cdrUrl).toBe('sunat/20123456789/01/F001-00000006.cdr');
      expect(result.pdfUrl).toBeNull();
    });

    it('debe lanzar NotFoundException si el comprobante no existe', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);

      await expect(service.getDocumentoSoporte('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('consultarEstadoSunat', () => {
    it('consulta CDR SUNAT directo, actualiza comprobante y registra log seguro', async () => {
      const cdrBase64 = Buffer.from('CDR DEMO OK').toString('base64');
      mockPrisma.comprobante.findUnique.mockResolvedValue({
        ...mockComprobante,
        estado: EstadoComprobante.EN_PROCESO_SUNAT,
        emisorRuc: '20123456789',
        intentosEnvio: 2,
      });
      mockSunatGateway.getStatusCdr.mockResolvedValue({
        accepted: true,
        codigoRespuesta: '0',
        mensaje: 'Aceptado',
        cdrContent: cdrBase64,
        requestPayload: { tipoComprobante: '01' },
        responsePayload: { statusCode: '0' },
      });
      mockPrisma.comprobante.update.mockResolvedValue({
        ...mockComprobante,
        estado: EstadoComprobante.ACEPTADO,
        codigoSunat: '0',
        mensajeSunat: 'Aceptado',
        cdrStorageKey: 'sunat/20123456789/01/F001-00000006.cdr',
      });

      const result = await service.consultarEstadoSunat('comp-1');

      expect(mockSunatGateway.getStatusCdr).toHaveBeenCalledWith({
        ruc: '20123456789',
        tipoComprobante: '01',
        serie: 'F001',
        correlativo: 6,
        ambiente: AmbienteSunat.BETA,
      });
      expect(mockPrisma.comprobante.update).toHaveBeenCalledWith({
        where: { id: 'comp-1' },
        data: expect.objectContaining({
          estado: EstadoComprobante.ACEPTADO,
          codigoSunat: '0',
          mensajeSunat: 'Aceptado',
          cdrStorageKey: 'sunat/20123456789/01/F001-00000006.cdr',
        }),
      });
      expect(mockPrisma.venta.update).toHaveBeenCalledWith({
        where: { id: 'venta-1' },
        data: { estadoFacturacion: EstadoFacturacionVenta.EMITIDA },
      });
      expect(mockPrisma.comprobanteEnvioLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          comprobanteId: 'comp-1',
          tipo: 'CONSULTA_TICKET',
          proveedor: 'SUNAT_DIRECT',
          tipoEvento: 'CONSULTA_CDR_SUNAT',
          estado: EstadoComprobante.ACEPTADO,
          intento: 2,
          requestPayload: { tipoComprobante: '01' },
          responsePayload: { statusCode: '0' },
          responseCode: '0',
          responseDescription: 'Aceptado',
          cdrStorageKey: 'sunat/20123456789/01/F001-00000006.cdr',
          codigoRespuesta: '0',
          mensaje: 'Aceptado',
        }),
      });
      expect(result.consulta.codigoRespuesta).toBe('0');
    });

    it('usa ambiente fiscal por defecto si no existe override de entorno', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      mockPrisma.configEmpresaFiscal.findFirst.mockResolvedValue({
        ambienteDefault: AmbienteSunat.PRODUCCION,
      });
      mockPrisma.comprobante.findUnique.mockResolvedValue({
        ...mockComprobante,
        estado: EstadoComprobante.EN_PROCESO_SUNAT,
        emisorRuc: '20123456789',
        intentosEnvio: 1,
      });
      mockSunatGateway.getStatusCdr.mockResolvedValue({
        accepted: false,
        codigoRespuesta: '98',
        mensaje: 'En proceso',
        cdrContent: null,
        requestPayload: {},
        responsePayload: { statusCode: '98' },
      });
      mockPrisma.comprobante.update.mockResolvedValue({
        ...mockComprobante,
        estado: EstadoComprobante.EN_PROCESO_SUNAT,
      });

      await service.consultarEstadoSunat('comp-1');

      expect(mockSunatGateway.getStatusCdr).toHaveBeenCalledWith(
        expect.objectContaining({ ambiente: AmbienteSunat.PRODUCCION }),
      );
    });

    it('mantiene estado ENVIADO cuando SUNAT informa consulta en proceso', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue({
        ...mockComprobante,
        estado: EstadoComprobante.PENDIENTE_ENVIO,
        emisorRuc: '20123456789',
        intentosEnvio: 0,
      });
      mockSunatGateway.getStatusCdr.mockResolvedValue({
        accepted: false,
        codigoRespuesta: '98',
        mensaje: 'En proceso',
        cdrContent: null,
        requestPayload: {},
        responsePayload: { statusCode: '98' },
      });
      mockPrisma.comprobante.update.mockResolvedValue({
        ...mockComprobante,
        estado: EstadoComprobante.EN_PROCESO_SUNAT,
      });

      await service.consultarEstadoSunat('comp-1');

      expect(mockPrisma.comprobante.update).toHaveBeenCalledWith({
        where: { id: 'comp-1' },
        data: expect.objectContaining({
          estado: EstadoComprobante.EN_PROCESO_SUNAT,
          codigoSunat: '98',
          mensajeSunat: 'En proceso',
        }),
      });
      expect(mockPrisma.comprobanteEnvioLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          estado: EstadoComprobante.EN_PROCESO_SUNAT,
          intento: 1,
        }),
      });
    });

    it('rechaza consulta SUNAT si el comprobante no existe', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);

      await expect(service.consultarEstadoSunat('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza consulta SUNAT si falta snapshot de RUC emisor', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue({
        ...mockComprobante,
        emisorRuc: null,
      });

      await expect(service.consultarEstadoSunat('comp-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSunatGateway.getStatusCdr).not.toHaveBeenCalled();
    });
  });

  describe('anularComprobante', () => {
    function primeFiscalConfigForBaja() {
      mockPrisma.configEmpresaFiscal.findFirst.mockResolvedValue({
        id: 'fiscal-1',
        ruc: '20123456789',
      });
      (
        mockPrisma as unknown as {
          certificadoDigital: { findFirst: jest.Mock };
        }
      ).certificadoDigital.findFirst.mockResolvedValue({
        id: 'cert-1',
        validoHasta: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SUNAT_SOL_PASSWORD') return 'sol-password';
        if (key === 'SUNAT_SOL_USERNAME') return '20123456789MODDATOS';
        return undefined;
      });
    }

    it('crea comunicación de baja y marca BAJA_PENDIENTE para comprobante ACEPTADO', async () => {
      const comprobanteAceptado = {
        ...mockComprobante,
        estado: EstadoComprobante.ACEPTADO,
        emisorRuc: '20123456789',
      };
      primeFiscalConfigForBaja();
      mockPrisma.comprobante.findUnique.mockResolvedValue(comprobanteAceptado);
      mockTx.configEmpresaFiscal.findFirst.mockResolvedValue({
        id: 'fiscal-1',
      });
      mockTx.comunicacionBaja.create.mockResolvedValue({
        id: 'baja-1',
        comprobanteId: 'comp-1',
        identificadorBaja: 'RA-20260506-000001',
      });
      mockTx.comprobante.update.mockResolvedValue({
        ...comprobanteAceptado,
        estado: EstadoComprobante.BAJA_PENDIENTE,
      });
      mockTx.comprobanteEnvioLog.create.mockResolvedValue({});

      const result = await service.anularComprobante(
        'comp-1',
        'user-1',
        'Error en datos del cliente',
      );

      expect(result.estado).toBe(EstadoComprobante.BAJA_PENDIENTE);
      expect(mockTx.comunicacionBaja.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          comprobanteId: 'comp-1',
          estado: 'PENDIENTE',
          iniciadoPor: 'user-1',
        }),
      });
    });

    it('debe rechazar anulación de comprobante no ACEPTADO', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue(mockComprobante); // PENDIENTE

      await expect(service.anularComprobante('comp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe rechazar si el comprobante no existe', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);

      await expect(
        service.anularComprobante('no-existe', 'system', 'Motivo de prueba'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar BOLETA y sugerir nota de crédito', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue({
        ...mockComprobante,
        tipo: TipoDocumento.BOLETA,
        estado: EstadoComprobante.ACEPTADO,
      });

      await expect(service.anularComprobante('comp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe rechazar si el plazo de 7 días calendario está vencido', async () => {
      const fechaVencida = new Date();
      fechaVencida.setDate(fechaVencida.getDate() - 10);
      mockPrisma.comprobante.findUnique.mockResolvedValue({
        ...mockComprobante,
        estado: EstadoComprobante.ACEPTADO,
        fechaEmision: fechaVencida,
      });

      await expect(service.anularComprobante('comp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('calcula el plazo desde cdrRecibidaAt cuando existe', async () => {
      const fechaEmisionAntigua = new Date();
      fechaEmisionAntigua.setDate(fechaEmisionAntigua.getDate() - 10);
      const cdrReciente = new Date();
      cdrReciente.setDate(cdrReciente.getDate() - 1);
      const comprobanteAceptado = {
        ...mockComprobante,
        estado: EstadoComprobante.ACEPTADO,
        emisorRuc: '20123456789',
        fechaEmision: fechaEmisionAntigua,
        cdrRecibidaAt: cdrReciente,
      };
      primeFiscalConfigForBaja();
      mockPrisma.comprobante.findUnique.mockResolvedValue(comprobanteAceptado);
      mockTx.configEmpresaFiscal.findFirst.mockResolvedValue({
        id: 'fiscal-1',
      });
      mockTx.comunicacionBaja.create.mockImplementation((args) =>
        Promise.resolve({ id: 'baja-1', ...args.data }),
      );
      mockTx.comprobante.update.mockResolvedValue({
        ...comprobanteAceptado,
        estado: EstadoComprobante.BAJA_PENDIENTE,
      });
      mockTx.comprobanteEnvioLog.create.mockResolvedValue({});

      await service.anularComprobante(
        'comp-1',
        'user-1',
        'Error en datos del cliente',
      );

      const createCall = mockTx.comunicacionBaja.create.mock.calls.at(-1)?.[0];
      expect(createCall.data.deadline.getTime()).toBeGreaterThan(
        fechaEmisionAntigua.getTime(),
      );
      expect(createCall.data.deadline.getTime()).toBeGreaterThan(
        cdrReciente.getTime(),
      );
      expect(mockQueue.add).toHaveBeenCalledWith(
        'comunicar-baja',
        expect.objectContaining({
          deadline: createCall.data.deadline.toISOString(),
        }),
        expect.any(Object),
      );
    });

    it('debe rechazar si ya existe una baja activa para el comprobante', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue({
        ...mockComprobante,
        estado: EstadoComprobante.ACEPTADO,
      });
      mockPrisma.comunicacionBaja.findFirst.mockResolvedValue({
        id: 'baja-existente',
        estado: 'PENDIENTE',
      });

      await expect(service.anularComprobante('comp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe generar identificador RA-yyyymmdd-NNN con correlativo padded', async () => {
      const comprobanteAceptado = {
        ...mockComprobante,
        estado: EstadoComprobante.ACEPTADO,
        emisorRuc: '20123456789',
      };
      primeFiscalConfigForBaja();
      mockPrisma.comprobante.findUnique.mockResolvedValue(comprobanteAceptado);
      mockTx.configEmpresaFiscal.findFirst.mockResolvedValue({
        id: 'fiscal-1',
      });
      mockTx.serieDocumentoBaja.upsert.mockResolvedValue({
        correlativoActual: 7,
      });
      mockTx.comunicacionBaja.create.mockImplementation((args) =>
        Promise.resolve({ id: 'baja-1', ...args.data }),
      );
      mockTx.comprobante.update.mockResolvedValue({
        ...comprobanteAceptado,
        estado: EstadoComprobante.BAJA_PENDIENTE,
      });
      mockTx.comprobanteEnvioLog.create.mockResolvedValue({});

      await service.anularComprobante(
        'comp-1',
        'user-1',
        'Motivo de prueba largo',
      );

      const createCall = mockTx.comunicacionBaja.create.mock.calls.at(-1)?.[0];
      expect(createCall.data.identificadorBaja).toMatch(/^RA-\d{8}-007$/);
    });
  });

  describe('consultarEstadoBaja', () => {
    it('marca baja RECHAZADA y guarda CDR cuando SUNAT rechaza con CDR', async () => {
      const cdrBase64 = Buffer.from('CDR BAJA RECHAZADA').toString('base64');
      const comunicacion = {
        id: 'baja-1',
        comprobanteId: 'comp-1',
        identificadorBaja: 'RA-20260506-001',
        estado: EstadoComunicacionBaja.EN_PROCESO,
        ticketSunat: 'TICKET-RA-1',
        errorMessage: null,
        comprobante: {
          id: 'comp-1',
          ventaId: 'venta-1',
          emisorRuc: '20123456789',
        },
      };
      mockPrisma.comunicacionBaja.findUnique.mockResolvedValue(comunicacion);
      mockSunatGateway.getStatus.mockResolvedValue({
        accepted: false,
        codigoRespuesta: '2200',
        mensaje: 'Baja rechazada por SUNAT',
        cdrContent: cdrBase64,
        requestPayload: { ticket: 'TICKET-RA-1' },
        responsePayload: { statusCode: '2200' },
      });
      mockPrisma.comunicacionBaja.update.mockResolvedValue({
        ...comunicacion,
        estado: EstadoComunicacionBaja.RECHAZADA,
      });
      mockPrisma.comprobante.update.mockResolvedValue({
        id: 'comp-1',
        estado: EstadoComprobante.ACEPTADO,
      });
      mockPrisma.comprobanteEnvioLog.create.mockResolvedValue({});

      const result = await service.consultarEstadoBaja('baja-1');

      expect(mockStorage.writeObject).toHaveBeenCalledWith(
        'sunat/bajas/RA-20260506-001.cdr',
        Buffer.from(cdrBase64, 'base64'),
        'application/zip',
      );
      expect(mockPrisma.comunicacionBaja.update).toHaveBeenCalledWith({
        where: { id: 'baja-1' },
        data: expect.objectContaining({
          estado: EstadoComunicacionBaja.RECHAZADA,
          cdrStorageKey: 'sunat/bajas/RA-20260506-001.cdr',
          cdrCodigo: '2200',
          cdrMensaje: 'Baja rechazada por SUNAT',
        }),
        include: { comprobante: true },
      });
      expect(mockPrisma.comprobante.update).toHaveBeenCalledWith({
        where: { id: 'comp-1' },
        data: { estado: EstadoComprobante.ACEPTADO },
      });
      expect(mockPrisma.comprobanteEnvioLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          comprobanteId: 'comp-1',
          tipoEvento: 'CONSULTA_TICKET_BAJA',
          estado: EstadoComprobante.ACEPTADO,
          responseCode: '2200',
        }),
      });
      expect(result.comunicacion.estado).toBe(EstadoComunicacionBaja.RECHAZADA);
    });
  });

  describe('crearNotaCredito', () => {
    it('debe crear nota de crédito sobre comprobante ACEPTADO', async () => {
      const aceptado = {
        ...mockComprobante,
        estado: EstadoComprobante.ACEPTADO,
        detallesFiscales: [
          {
            item: 1,
            productoId: 'prod-1',
            codigoInterno: 'EQP-001',
            descripcion: 'Equipo portátil empresarial',
            unidadSunat: 'NIU',
            tipoFiscalProducto: TipoFiscalProducto.BIEN,
            tipoAfectacionIgv: TipoAfectacionIgv.GRAVADO_OPERACION_ONEROSA,
            cantidad: 2,
            valorUnitario: 500,
            precioUnitario: 590,
            descuento: 0,
            baseImponible: 1000,
            igv: 180,
            total: 1180,
          },
        ],
      };
      mockPrisma.comprobante.findUnique.mockResolvedValue(aceptado);
      mockTx.configEmpresa.findFirst.mockResolvedValue(mockConfig);
      mockTx.configEmpresa.update.mockResolvedValue({
        ...mockConfig,
        correlativoNotaCredito: 3,
      });
      // Tras la unificación, NC vive como Comprobante con tipo=NOTA_CREDITO.
      mockTx.comprobante.create.mockResolvedValue({
        id: 'nc-1',
        numero: 'FC01-00000003',
        estado: EstadoComprobante.PENDIENTE_ENVIO,
        tipo: TipoDocumento.NOTA_CREDITO,
      });

      const result = await service.crearNotaCredito({
        comprobanteOrigenId: 'comp-1',
        motivoCodigo: '01',
        motivoDescripcion: 'Anulación por error en RUC del receptor',
        monto: 500,
        lineas: [
          {
            item: 1,
            descripcion: 'Acreditación parcial del equipo',
            cantidad: 1,
            precioUnitario: 500,
            total: 500,
          },
        ],
      });

      expect(result.id).toBe('nc-1');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'enviar-comprobante',
        expect.objectContaining({ comprobanteId: 'nc-1' }),
        expect.anything(),
      );
      expect(mockTx.comprobanteDetalle.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            comprobanteId: 'nc-1',
            item: 1,
            codigoInterno: 'EQP-001',
            descripcion: 'Acreditación parcial del equipo',
            total: 500,
          }),
        ],
      });
    });

    it('debe rechazar NC parcial sin líneas', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue({
        ...mockComprobante,
        estado: EstadoComprobante.ACEPTADO,
      });

      await expect(
        service.crearNotaCredito({
          comprobanteOrigenId: 'comp-1',
          motivoCodigo: '05',
          motivoDescripcion: 'Descuento por ítem vendido',
          monto: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si comprobante no está ACEPTADO', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue(mockComprobante); // PENDIENTE

      await expect(
        service.crearNotaCredito({
          comprobanteOrigenId: 'comp-1',
          motivoCodigo: '01',
          motivoDescripcion: 'Anulación por error en datos',
          monto: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si monto excede total del comprobante', async () => {
      const aceptado = {
        ...mockComprobante,
        estado: EstadoComprobante.ACEPTADO,
      };
      mockPrisma.comprobante.findUnique.mockResolvedValue(aceptado);

      await expect(
        service.crearNotaCredito({
          comprobanteOrigenId: 'comp-1',
          motivoCodigo: '01',
          motivoDescripcion: 'Anulación por error en datos',
          monto: 99999,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si comprobante no existe', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);

      await expect(
        service.crearNotaCredito({
          comprobanteOrigenId: 'no-existe',
          motivoCodigo: '01',
          motivoDescripcion: 'Anulación por error en datos',
          monto: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar motivo Cat 09 inválido', async () => {
      await expect(
        service.crearNotaCredito({
          comprobanteOrigenId: 'comp-1',
          motivoCodigo: '99' as never,
          motivoDescripcion: 'Motivo inexistente xyz',
          monto: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar descripción menor a 10 caracteres', async () => {
      await expect(
        service.crearNotaCredito({
          comprobanteOrigenId: 'comp-1',
          motivoCodigo: '01',
          motivoDescripcion: 'corta',
          monto: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar excepcional con motivo distinto a 01/02', async () => {
      await expect(
        service.crearNotaCredito({
          comprobanteOrigenId: 'comp-1',
          motivoCodigo: '07',
          motivoDescripcion: 'Devolución por ítem (excepcional)',
          monto: 100,
          esExcepcional: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('crearNotaDebito', () => {
    it('debe crear nota de débito sobre comprobante ACEPTADO', async () => {
      const aceptado = {
        ...mockComprobante,
        estado: EstadoComprobante.ACEPTADO,
      };
      mockPrisma.comprobante.findUnique.mockResolvedValue(aceptado);
      mockTx.configEmpresa.findFirst.mockResolvedValue(mockConfig);
      mockTx.configEmpresa.update.mockResolvedValue({
        ...mockConfig,
        correlativoNotaDebito: 2,
      });
      mockTx.comprobante.create.mockResolvedValue({
        id: 'nd-1',
        numero: 'FD01-00000002',
        estado: EstadoComprobante.PENDIENTE_ENVIO,
        tipo: TipoDocumento.NOTA_DEBITO,
      });

      const result = await service.crearNotaDebito({
        comprobanteOrigenId: 'comp-1',
        motivoCodigo: '03',
        motivoDescripcion: 'Penalidad por incumplimiento contractual',
        monto: 200,
      });

      expect(result.id).toBe('nd-1');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'enviar-comprobante',
        expect.objectContaining({ comprobanteId: 'nd-1' }),
        expect.anything(),
      );
    });

    it('debe rechazar si comprobante no está ACEPTADO', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue(mockComprobante);

      await expect(
        service.crearNotaDebito({
          comprobanteOrigenId: 'comp-1',
          motivoCodigo: '03',
          motivoDescripcion: 'Penalidad por incumplimiento contractual',
          monto: 200,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si comprobante no existe', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);

      await expect(
        service.crearNotaDebito({
          comprobanteOrigenId: 'no-existe',
          motivoCodigo: '03',
          motivoDescripcion: 'Penalidad por incumplimiento contractual',
          monto: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar motivo Cat 10 inválido', async () => {
      await expect(
        service.crearNotaDebito({
          comprobanteOrigenId: 'comp-1',
          motivoCodigo: '99' as never,
          motivoDescripcion: 'Motivo inexistente xyz',
          monto: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getConfig', () => {
    it('debe retornar configuración de empresa', async () => {
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getConfig();

      expect(result.ruc).toBe('20123456789');
    });

    it('debe lanzar NotFoundException si no hay configuración', async () => {
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(null);

      await expect(service.getConfig()).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateConfig', () => {
    it('debe actualizar configuración', async () => {
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(mockConfig);
      mockPrisma.configEmpresa.update.mockResolvedValue({
        ...mockConfig,
        razonSocial: 'NUEVA EMPRESA SAC',
      });

      const result = await service.updateConfig({
        razonSocial: 'NUEVA EMPRESA SAC',
      });

      expect(result.razonSocial).toBe('NUEVA EMPRESA SAC');
    });

    it('debe lanzar NotFoundException si no hay configuración', async () => {
      mockPrisma.configEmpresa.findFirst.mockResolvedValue(null);

      await expect(
        service.updateConfig({ razonSocial: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reintentarEnvio', () => {
    it('debe reencolar comprobante RECHAZADO', async () => {
      const rechazado = {
        ...mockComprobante,
        estado: EstadoComprobante.RECHAZADO,
      };
      mockPrisma.comprobante.findUnique.mockResolvedValue(rechazado);
      mockPrisma.comprobante.update.mockResolvedValue({
        ...rechazado,
        estado: EstadoComprobante.PENDIENTE_ENVIO,
      });

      const result = await service.reintentarEnvio('comp-1');

      expect(result.message).toContain('reencolado');
      expect(mockPrisma.comprobante.update).toHaveBeenCalledWith({
        where: { id: 'comp-1' },
        data: {
          estado: EstadoComprobante.PENDIENTE_ENVIO,
          payloadHash: null,
          hashCpe: null,
          xmlStorageKey: null,
        },
      });
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('debe rechazar si no está RECHAZADO', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue(mockComprobante); // PENDIENTE

      await expect(service.reintentarEnvio('comp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe rechazar si no existe', async () => {
      mockPrisma.comprobante.findUnique.mockResolvedValue(null);

      await expect(service.reintentarEnvio('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
