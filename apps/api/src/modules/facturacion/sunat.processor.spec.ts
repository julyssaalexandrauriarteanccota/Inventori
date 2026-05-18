import { ConfigService } from '@nestjs/config';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  AmbienteSunat,
  EstadoComprobante,
  EstadoComunicacionBaja,
  EstadoFacturacionVenta,
} from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { EventsService } from '../../websockets/events.service';
import { VentaReversoFiscalService } from '../ventas/venta-reverso-fiscal.service';
import { SunatProcessor } from './sunat.processor';

const mockPrisma = {
  comprobante: {
    findUnique: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _sum: { total: 0 } }),
  },
  venta: {
    update: jest.fn(),
  },
  // Tras la unificación, NC/ND viven en `comprobante`. Las pruebas usan
  // `mockPrisma.comprobante.findUnique/update` para todos los tipos.
  comprobanteEnvioLog: {
    create: jest.fn(),
    findFirst: jest.fn().mockResolvedValue(null),
  },
  configEmpresaFiscal: {
    findFirst: jest.fn(),
  },
  comunicacionBaja: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaService;

const mockConfig = {
  get: jest.fn(),
} as unknown as ConfigService;

const mockEvents = {
  emitToUser: jest.fn(),
  emitToRole: jest.fn(),
  emitToRoles: jest.fn(),
  emitToAll: jest.fn(),
} as unknown as EventsService;

const mockVentaReversoFiscal = {
  aplicarReversoPorBajaFiscal: jest.fn(),
} as unknown as VentaReversoFiscalService;

const mockSunatQueue = {
  add: jest.fn(),
} as unknown as import('bullmq').Queue;

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
        tipo: unknown;
      },
      ext: string,
    ) =>
      `sunat/cpe/${c.emisorRuc ?? 'sin-ruc'}/${c.serie}-${c.correlativo}.${ext === 'cdr' ? 'cdr.zip' : ext}`,
  ),
  buildBajaStorageKey: jest.fn(
    (b: { identificadorBaja: string }, ext: string) =>
      `sunat/bajas/${b.identificadorBaja}.${ext === 'cdr' ? 'cdr.zip' : 'xml'}`,
  ),
  putXml: jest.fn().mockResolvedValue('xml-key'),
  putCdrZip: jest.fn().mockResolvedValue('cdr-key'),
  putPdf: jest.fn().mockResolvedValue('pdf-key'),
  putBajaXml: jest.fn().mockResolvedValue('baja-xml-key'),
  putBajaCdr: jest.fn().mockResolvedValue('baja-cdr-key'),
} as unknown as import('./fiscal-storage.service').FiscalStorageService;

const mockPdfService = {
  render: jest.fn().mockResolvedValue(Buffer.from('pdf')),
} as unknown as import('./comprobante-pdf.service').ComprobantePdfService;

const mockEmailService = {
  enviarComprobanteAceptado: jest.fn().mockResolvedValue(undefined),
} as unknown as import('./comprobante-email.service').ComprobanteEmailService;

describe('SunatProcessor', () => {
  let processor: SunatProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockConfig.get as jest.Mock).mockReset();
    (mockConfig.get as jest.Mock).mockImplementation(
      (_key: string, defaultValue?: string) => defaultValue,
    );
    (mockPrisma.configEmpresaFiscal.findFirst as jest.Mock).mockResolvedValue(
      null,
    );
    processor = new SunatProcessor(
      mockPrisma,
      mockConfig,
      mockEvents,
      mockVentaReversoFiscal,
      mockStorage,
      mockPdfService,
      mockEmailService,
      mockSunatQueue,
    );
  });

  it('marca comprobante como ACEPTADO en modo desarrollo cuando SUNAT directo no está configurado', async () => {
    (mockPrisma.comprobante.findUnique as jest.Mock).mockResolvedValue({
      id: 'comp-1',
      ventaId: 'venta-1',
      numero: 'F001-00000001',
      serie: 'F001',
      correlativo: 1,
      tipo: 'FACTURA',
      fechaEmision: new Date().toISOString(),
      clienteDocTipo: '6',
      clienteDocNum: '20123456789',
      clienteNombre: 'Cliente SAC',
      clienteDireccion: 'Av. Demo',
      subtotal: 100,
      igv: 18,
      total: 118,
      intentosEnvio: 0,
      detallesFiscales: [],
      venta: {
        cliente: {},
        detalles: [],
      },
    });
    (mockConfig.get as jest.Mock).mockReturnValue(undefined);

    await processor.process({
      name: 'enviar-comprobante',
      data: { comprobanteId: 'comp-1' },
    } as never);

    expect(mockPrisma.comprobanteEnvioLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipoEvento: 'ENVIO_INICIADO',
        estado: EstadoComprobante.EN_PROCESO_SUNAT,
      }),
    });
    expect(mockPrisma.comprobanteEnvioLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipoEvento: 'RESPUESTA_DEV',
        estado: EstadoComprobante.ACEPTADO,
      }),
    });

    expect((mockPrisma.comprobante.update as jest.Mock).mock.calls).toEqual(
      expect.arrayContaining([
        [
          expect.objectContaining({
            data: expect.objectContaining({
              estado: EstadoComprobante.EN_PROCESO_SUNAT,
            }),
          }),
        ],
        [
          expect.objectContaining({
            data: expect.objectContaining({
              estado: EstadoComprobante.ACEPTADO,
            }),
          }),
        ],
      ]),
    );
    expect(mockPrisma.venta.update).toHaveBeenCalledWith({
      where: { id: 'venta-1' },
      data: { estadoFacturacion: EstadoFacturacionVenta.EMITIDA },
    });
  });

  it('no marca aceptación local cuando el ambiente SUNAT es PRODUCCION', async () => {
    (mockPrisma.comprobante.findUnique as jest.Mock).mockResolvedValue({
      id: 'comp-prod-1',
      numero: 'F001-00000002',
      serie: 'F001',
      correlativo: 2,
      tipo: 'FACTURA',
      fechaEmision: new Date().toISOString(),
      clienteDocTipo: '6',
      clienteDocNum: '20123456789',
      clienteNombre: 'Cliente SAC',
      clienteDireccion: 'Av. Demo',
      subtotal: 100,
      igv: 18,
      total: 118,
      intentosEnvio: 0,
      detallesFiscales: [],
      venta: {
        cliente: {},
        detalles: [],
      },
    });
    (mockConfig.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: string) => {
        if (key === 'SUNAT_ENVIRONMENT') return AmbienteSunat.PRODUCCION;
        return defaultValue;
      },
    );

    // Doc 06 §3 — en PRODUCCION + servicios no inyectados, el error es
    // NO_RECUPERABLE → marcar REQUIERE_REVISION sin re-tirar (BullMQ no debe
    // reintentar errores de configuración). Tampoco se acepta en modo dev.
    await processor.process({
      name: 'enviar-comprobante',
      data: { comprobanteId: 'comp-prod-1' },
    } as never);

    expect(mockPrisma.comprobanteEnvioLog.create).not.toHaveBeenCalledWith({
      data: expect.objectContaining({ tipoEvento: 'RESPUESTA_DEV' }),
    });
    expect(mockPrisma.comprobante.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: EstadoComprobante.REQUIERE_REVISION,
        }),
      }),
    );
    expect(mockPrisma.comprobanteEnvioLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipoEvento: 'REQUIERE_REVISION',
        estado: EstadoComprobante.REQUIERE_REVISION,
      }),
    });
  });

  it('envía nota de crédito por SUNAT directo usando UBL CreditNote', async () => {
    const mockBuilder = {
      buildCreditNote: jest.fn().mockReturnValue({
        fileName: '20123456789-07-FC01-00000001',
        xmlFileName: '20123456789-07-FC01-00000001.xml',
        documentCode: '07',
        xml: '<CreditNote />',
      }),
    };
    const mockSigner = {
      sign: jest.fn().mockResolvedValue({
        signedXml: '<CreditNote><Signature /></CreditNote>',
        certificateId: 'cert-1',
        certificateFingerprintSha256: 'fingerprint',
      }),
    };
    const mockGateway = {
      sendBill: jest.fn().mockResolvedValue({
        accepted: true,
        codigoRespuesta: '0',
        mensaje: 'Aceptado',
        requestPayload: { fileName: '20123456789-07-FC01-00000001.zip' },
        responsePayload: { httpStatus: 200 },
        cdrContent: 'cdr-credit-note-demo',
      }),
    };
    processor = new SunatProcessor(
      mockPrisma,
      mockConfig,
      mockEvents,
      mockVentaReversoFiscal,
      mockStorage,
      mockPdfService,
      mockEmailService,
      mockSunatQueue,
      mockBuilder as never,
      mockSigner as never,
      mockGateway as never,
    );
    const comprobanteOrigen = {
      id: 'comp-1',
      numero: 'F001-00000001',
      tipo: 'FACTURA',
      emisorRuc: '20123456789',
      detallesFiscales: [],
    };
    // Tras la unificación, NC vive como Comprobante con tipo=NOTA_CREDITO.
    (mockPrisma.comprobante.findUnique as jest.Mock).mockResolvedValue({
      id: 'nc-1',
      ventaId: null,
      tipo: 'NOTA_CREDITO',
      serie: 'FC01',
      correlativo: 1,
      numero: 'FC01-00000001',
      emisorRuc: '20123456789',
      comprobanteOrigenId: 'comp-1',
      comprobanteOrigen,
      motivoNota: '07',
      motivoNotaDescripcion: 'Devolución por ítem',
      total: 100,
      intentosEnvio: 0,
      estado: 'PENDIENTE_ENVIO',
      detallesFiscales: [],
      fechaEmision: new Date(),
    });
    (mockConfig.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: string) => {
        if (key === 'SUNAT_ENVIRONMENT') return AmbienteSunat.BETA;
        return defaultValue;
      },
    );

    // Job legacy `enviar-nota-credito` debe rutear a enviarComprobante
    // tras la unificación (compat retroactivo).
    await processor.process({
      name: 'enviar-nota-credito',
      data: { notaCreditoId: 'nc-1' },
    } as never);

    expect(mockBuilder.buildCreditNote).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'nc-1', comprobanteOrigen }),
    );
    expect(mockGateway.sendBill).toHaveBeenCalledWith({
      ruc: '20123456789',
      fileName: '20123456789-07-FC01-00000001',
      xmlFileName: '20123456789-07-FC01-00000001.xml',
      signedXml: '<CreditNote><Signature /></CreditNote>',
      ambiente: AmbienteSunat.BETA,
    });
    expect(mockPrisma.comprobante.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'nc-1' },
        data: expect.objectContaining({
          estado: EstadoComprobante.ACEPTADO,
        }),
      }),
    );
  });

  it('marca venta ANULADA_FISCAL cuando NC aceptada anula total de boleta', async () => {
    const mockBuilder = {
      buildCreditNote: jest.fn().mockReturnValue({
        fileName: '20123456789-07-BC01-00000001',
        xmlFileName: '20123456789-07-BC01-00000001.xml',
        documentCode: '07',
        xml: '<CreditNote />',
      }),
    };
    const mockSigner = {
      sign: jest.fn().mockResolvedValue({
        signedXml: '<CreditNote><Signature /></CreditNote>',
        certificateId: 'cert-1',
        certificateFingerprintSha256: 'fingerprint',
      }),
    };
    const mockGateway = {
      sendBill: jest.fn().mockResolvedValue({
        accepted: true,
        codigoRespuesta: '0',
        mensaje: 'Aceptado',
        requestPayload: {},
        responsePayload: {},
      }),
    };
    processor = new SunatProcessor(
      mockPrisma,
      mockConfig,
      mockEvents,
      mockVentaReversoFiscal,
      mockStorage,
      mockPdfService,
      mockEmailService,
      mockSunatQueue,
      mockBuilder as never,
      mockSigner as never,
      mockGateway as never,
    );
    const comprobanteOrigen = {
      id: 'comp-boleta-1',
      ventaId: 'venta-boleta-1',
      numero: 'B001-00000001',
      tipo: 'BOLETA',
      total: 118,
      emisorRuc: '20123456789',
      detallesFiscales: [],
    };
    // Tras la unificación, la NC vive como Comprobante con tipo=NOTA_CREDITO
    // y motivoNota='01' (anulación).
    (mockPrisma.comprobante.findUnique as jest.Mock).mockResolvedValue({
      id: 'nc-boleta-1',
      ventaId: null,
      tipo: 'NOTA_CREDITO',
      serie: 'BC01',
      correlativo: 1,
      numero: 'BC01-00000001',
      emisorRuc: '20123456789',
      comprobanteOrigenId: 'comp-boleta-1',
      comprobanteOrigen,
      motivoNota: '01',
      motivoNotaDescripcion: 'Anulacion de la operacion',
      total: 118,
      intentosEnvio: 0,
      estado: 'PENDIENTE_ENVIO',
      detallesFiscales: [],
      fechaEmision: new Date(),
    });
    (mockConfig.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: string) => {
        if (key === 'SUNAT_ENVIRONMENT') return AmbienteSunat.BETA;
        return defaultValue;
      },
    );

    await processor.process({
      name: 'enviar-nota-credito',
      data: { notaCreditoId: 'nc-boleta-1' },
    } as never);

    expect(mockPrisma.venta.update).toHaveBeenCalledWith({
      where: { id: 'venta-boleta-1' },
      data: { estadoFacturacion: EstadoFacturacionVenta.ANULADA_FISCAL },
    });
  });

  it('marca venta ANULADA_FISCAL cuando NC aceptada anula total de factura', async () => {
    const mockBuilder = {
      buildCreditNote: jest.fn().mockReturnValue({
        fileName: '20123456789-07-FC01-00000009',
        xmlFileName: '20123456789-07-FC01-00000009.xml',
        documentCode: '07',
        xml: '<CreditNote />',
      }),
    };
    const mockSigner = {
      sign: jest.fn().mockResolvedValue({
        signedXml: '<CreditNote><Signature /></CreditNote>',
        certificateId: 'cert-1',
        certificateFingerprintSha256: 'fingerprint',
      }),
    };
    const mockGateway = {
      sendBill: jest.fn().mockResolvedValue({
        accepted: true,
        codigoRespuesta: '0',
        mensaje: 'Aceptado',
        requestPayload: {},
        responsePayload: {},
      }),
    };
    processor = new SunatProcessor(
      mockPrisma,
      mockConfig,
      mockEvents,
      mockVentaReversoFiscal,
      mockStorage,
      mockPdfService,
      mockEmailService,
      mockSunatQueue,
      mockBuilder as never,
      mockSigner as never,
      mockGateway as never,
    );
    const comprobanteOrigen = {
      id: 'comp-factura-nc-1',
      ventaId: 'venta-factura-nc-1',
      numero: 'F001-00000009',
      tipo: 'FACTURA',
      total: 500,
      emisorRuc: '20123456789',
      detallesFiscales: [],
    };
    (mockPrisma.comprobante.findUnique as jest.Mock).mockResolvedValue({
      id: 'nc-factura-1',
      ventaId: null,
      tipo: 'NOTA_CREDITO',
      serie: 'FC01',
      correlativo: 9,
      numero: 'FC01-00000009',
      emisorRuc: '20123456789',
      comprobanteOrigenId: 'comp-factura-nc-1',
      comprobanteOrigen,
      motivoNota: '01',
      motivoNotaDescripcion: 'Anulacion de la operacion',
      total: 500,
      intentosEnvio: 0,
      estado: 'PENDIENTE_ENVIO',
      detallesFiscales: [],
      fechaEmision: new Date(),
    });
    (mockConfig.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: string) => {
        if (key === 'SUNAT_ENVIRONMENT') return AmbienteSunat.BETA;
        return defaultValue;
      },
    );

    await processor.process({
      name: 'enviar-nota-credito',
      data: { notaCreditoId: 'nc-factura-1' },
    } as never);

    expect(mockPrisma.venta.update).toHaveBeenCalledWith({
      where: { id: 'venta-factura-nc-1' },
      data: { estadoFacturacion: EstadoFacturacionVenta.ANULADA_FISCAL },
    });
  });

  // Doc 08 §4 — Dos NCs parciales sobre la misma boleta cuyas sumas
  // alcanzan el total origen, deben marcar la venta como ANULADA_FISCAL
  // aun cuando ningún motivo individual sea "01" (anulación explícita).
  it('marca venta ANULADA_FISCAL cuando suma de NCs parciales alcanza total origen', async () => {
    const mockBuilder = {
      buildCreditNote: jest.fn().mockReturnValue({
        fileName: '20123456789-07-BC01-00000002',
        xmlFileName: '20123456789-07-BC01-00000002.xml',
        documentCode: '07',
        xml: '<CreditNote />',
      }),
    };
    const mockSigner = {
      sign: jest.fn().mockResolvedValue({
        signedXml: '<CreditNote><Signature /></CreditNote>',
        certificateId: 'cert-1',
        certificateFingerprintSha256: 'fingerprint',
      }),
    };
    const mockGateway = {
      sendBill: jest.fn().mockResolvedValue({
        accepted: true,
        codigoRespuesta: '0',
        mensaje: 'Aceptado',
        requestPayload: {},
        responsePayload: {},
      }),
    };
    processor = new SunatProcessor(
      mockPrisma,
      mockConfig,
      mockEvents,
      mockVentaReversoFiscal,
      mockStorage,
      mockPdfService,
      mockEmailService,
      mockSunatQueue,
      mockBuilder as never,
      mockSigner as never,
      mockGateway as never,
    );
    const comprobanteOrigen = {
      id: 'comp-boleta-2',
      ventaId: 'venta-boleta-2',
      numero: 'B001-00000002',
      tipo: 'BOLETA',
      total: 200,
      emisorRuc: '20123456789',
      detallesFiscales: [],
    };
    // Esta es la 2da NC: motivo 05 (descuento por ítem), monto parcial 50.
    // La 1ra NC ya estaba aceptada por 150. Total 50 + 150 = 200 = total origen.
    (mockPrisma.comprobante.findUnique as jest.Mock).mockResolvedValue({
      id: 'nc-parcial-2',
      ventaId: null,
      tipo: 'NOTA_CREDITO',
      serie: 'BC01',
      correlativo: 2,
      numero: 'BC01-00000002',
      emisorRuc: '20123456789',
      comprobanteOrigenId: 'comp-boleta-2',
      comprobanteOrigen,
      motivoNota: '05',
      motivoNotaDescripcion: 'Descuento parcial por item defectuoso',
      total: 50,
      intentosEnvio: 0,
      estado: 'PENDIENTE_ENVIO',
      detallesFiscales: [],
      fechaEmision: new Date(),
    });
    (mockPrisma.comprobante.aggregate as jest.Mock).mockResolvedValue({
      _sum: { total: 200 }, // 150 (1ra NC ACEPTADA) + 50 (esta NC tras aceptarse)
    });
    (mockConfig.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: string) => {
        if (key === 'SUNAT_ENVIRONMENT') return AmbienteSunat.BETA;
        return defaultValue;
      },
    );

    await processor.process({
      name: 'enviar-nota-credito',
      data: { notaCreditoId: 'nc-parcial-2' },
    } as never);

    expect(mockPrisma.venta.update).toHaveBeenCalledWith({
      where: { id: 'venta-boleta-2' },
      data: { estadoFacturacion: EstadoFacturacionVenta.ANULADA_FISCAL },
    });
  });

  it('marca nota de débito como RECHAZADA si SUNAT directo rechaza el UBL DebitNote', async () => {
    const mockBuilder = {
      buildDebitNote: jest.fn().mockReturnValue({
        fileName: '20123456789-08-FD01-00000001',
        xmlFileName: '20123456789-08-FD01-00000001.xml',
        documentCode: '08',
        xml: '<DebitNote />',
      }),
    };
    const mockSigner = {
      sign: jest.fn().mockResolvedValue({
        signedXml: '<DebitNote><Signature /></DebitNote>',
        certificateId: 'cert-1',
        certificateFingerprintSha256: 'fingerprint',
      }),
    };
    const mockGateway = {
      sendBill: jest.fn().mockResolvedValue({
        accepted: false,
        codigoRespuesta: 'SUNAT-ERROR-DEMO',
        mensaje: 'Nota de débito de ejemplo rechazada',
        requestPayload: { fileName: '20123456789-08-FD01-00000001.zip' },
        responsePayload: { httpStatus: 200 },
      }),
    };
    processor = new SunatProcessor(
      mockPrisma,
      mockConfig,
      mockEvents,
      mockVentaReversoFiscal,
      mockStorage,
      mockPdfService,
      mockEmailService,
      mockSunatQueue,
      mockBuilder as never,
      mockSigner as never,
      mockGateway as never,
    );
    (mockPrisma.comprobante.findUnique as jest.Mock).mockResolvedValue({
      id: 'nd-1',
      ventaId: null,
      tipo: 'NOTA_DEBITO',
      serie: 'FD01',
      correlativo: 1,
      numero: 'FD01-00000001',
      emisorRuc: '20123456789',
      comprobanteOrigenId: 'comp-1',
      comprobanteOrigen: {
        id: 'comp-1',
        numero: 'F001-00000001',
        tipo: 'FACTURA',
        emisorRuc: '20123456789',
        detallesFiscales: [],
      },
      motivoNota: '01',
      motivoNotaDescripcion: 'Intereses por mora',
      total: 100,
      intentosEnvio: 1,
      estado: 'PENDIENTE_ENVIO',
      detallesFiscales: [],
      fechaEmision: new Date(),
    });
    (mockConfig.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: string) => {
        if (key === 'SUNAT_ENVIRONMENT') return AmbienteSunat.BETA;
        return defaultValue;
      },
    );

    await processor.process({
      name: 'enviar-nota-debito',
      data: { notaDebitoId: 'nd-1' },
    } as never);

    expect(mockBuilder.buildDebitNote).toHaveBeenCalled();
    expect(mockPrisma.comprobante.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'nd-1' },
        data: expect.objectContaining({
          estado: EstadoComprobante.RECHAZADO,
        }),
      }),
    );
  });

  it('marca comprobante como RECHAZADO cuando SUNAT directo lanza error', async () => {
    const mockBuilder = {
      buildInvoice: jest.fn().mockReturnValue({
        fileName: '20123456789-01-F001-1',
        xmlFileName: '20123456789-01-F001-1.xml',
        documentCode: '01',
        xml: '<Invoice />',
      }),
    };
    const mockSigner = {
      sign: jest.fn().mockResolvedValue({
        signedXml: '<Invoice><Signature /></Invoice>',
        certificateId: 'cert-1',
        certificateFingerprintSha256: 'fingerprint',
      }),
    };
    const mockGateway = {
      sendBill: jest.fn().mockRejectedValue(new Error('network error')),
    };
    processor = new SunatProcessor(
      mockPrisma,
      mockConfig,
      mockEvents,
      mockVentaReversoFiscal,
      mockStorage,
      mockPdfService,
      mockEmailService,
      mockSunatQueue,
      mockBuilder as never,
      mockSigner as never,
      mockGateway as never,
    );
    (mockPrisma.comprobante.findUnique as jest.Mock).mockResolvedValue({
      id: 'comp-1',
      numero: 'F001-00000001',
      serie: 'F001',
      correlativo: 1,
      tipo: 'FACTURA',
      fechaEmision: new Date().toISOString(),
      clienteDocTipo: '6',
      clienteDocNum: '20123456789',
      clienteNombre: 'Cliente SAC',
      clienteDireccion: 'Av. Demo',
      emisorRuc: '20123456789',
      emisorRazonSocial: 'Empresa Demo SAC',
      emisorDireccionFiscal: 'Av. Fiscal',
      subtotal: 100,
      igv: 18,
      total: 118,
      intentosEnvio: 0,
      detallesFiscales: [
        {
          item: 1,
          codigoInterno: 'EQP-001',
          descripcion: 'Equipo portátil empresarial',
          unidadSunat: 'NIU',
          cantidad: 1,
          valorUnitario: 100,
          precioUnitario: 118,
          baseImponible: 100,
          igv: 18,
          total: 118,
        },
      ],
      venta: {
        cliente: {},
        detalles: [],
      },
    });
    (mockConfig.get as jest.Mock).mockImplementation(
      (key: string, defaultValue?: string) => {
        if (key === 'SUNAT_ENVIRONMENT') return 'BETA';
        return defaultValue;
      },
    );

    await expect(
      processor.process({
        name: 'enviar-comprobante',
        data: { comprobanteId: 'comp-1' },
      } as never),
    ).rejects.toThrow('network error');

    // Doc 06 §3 — un error de red ("network error") es RECUPERABLE. En el
    // primer intento (job no provisto = isLastAttempt=false) el processor
    // re-lanza para que BullMQ reintente, registra ENVIO_ERROR (no
    // ERROR_ENVIO) y deja el comprobante en PENDIENTE_ENVIO (no RECHAZADO).
    expect(mockPrisma.comprobanteEnvioLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tipoEvento: 'ENVIO_ERROR',
        estado: EstadoComprobante.PENDIENTE_ENVIO,
      }),
    });

    expect(mockPrisma.comprobante.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: EstadoComprobante.PENDIENTE_ENVIO,
        }),
      }),
    );
  });

  describe('comunicar-baja → consultar-ticket-baja', () => {
    const FISCAL_DIR = join(tmpdir(), `fiscal-baja-${Date.now()}`);
    const baseComunicacion = {
      id: 'baja-1',
      identificadorBaja: 'RA-20260506-001',
      motivo: 'Error de digitación',
      estado: EstadoComunicacionBaja.PENDIENTE,
      ticketSunat: null as string | null,
      iniciadoPor: 'user-1',
      createdAt: new Date('2026-05-06T10:00:00.000Z'),
      comprobante: {
        id: 'comp-1',
        ventaId: 'venta-1',
        tipo: 'FACTURA',
        serie: 'F001',
        correlativo: 7,
        fechaEmision: new Date('2026-05-02T10:00:00.000Z'),
        emisorRuc: '20123456789',
        emisorRazonSocial: 'Empresa Demo SAC',
      },
    };

    beforeAll(() => {
      process.env.FISCAL_PRIVATE_STORAGE_DIR = FISCAL_DIR;
    });

    afterAll(() => {
      delete process.env.FISCAL_PRIVATE_STORAGE_DIR;
    });

    function makeProcessor(
      overrides: {
        gateway?: Record<string, jest.Mock>;
        builder?: Record<string, jest.Mock>;
        signer?: Record<string, jest.Mock>;
        queue?: Record<string, jest.Mock>;
      } = {},
    ) {
      const builder = overrides.builder ?? {
        buildVoidedNote: jest.fn().mockReturnValue({
          fileName: '20123456789-RA-20260506-001',
          xmlFileName: '20123456789-RA-20260506-001.xml',
          documentCode: '01',
          xml: '<VoidedDocuments />',
        }),
      };
      const signer = overrides.signer ?? {
        sign: jest.fn().mockResolvedValue({
          signedXml: '<VoidedDocuments><Signature /></VoidedDocuments>',
          certificateId: 'cert-1',
          certificateFingerprintSha256: 'fingerprint',
        }),
      };
      const gateway = overrides.gateway ?? {
        sendSummary: jest.fn().mockResolvedValue({
          accepted: true,
          ticket: 'TICKET-123',
          codigoRespuesta: '0',
          mensaje: 'Recibido',
          requestPayload: { fileName: 'demo' },
          responsePayload: { httpStatus: 200 },
        }),
        getStatus: jest.fn(),
      };
      const queue = (overrides.queue ?? {
        add: jest.fn().mockResolvedValue(undefined),
      }) as unknown as import('bullmq').Queue;
      const proc = new SunatProcessor(
        mockPrisma,
        mockConfig,
        mockEvents,
        mockVentaReversoFiscal,
        mockStorage,
        mockPdfService,
        mockEmailService,
        queue,
        builder as never,
        signer as never,
        gateway as never,
      );
      return { proc, builder, signer, gateway, queue };
    }

    it('comunicar-baja: envía sendSummary, persiste ticket y encola consulta a 30s', async () => {
      (mockPrisma.comunicacionBaja.findUnique as jest.Mock).mockResolvedValue({
        ...baseComunicacion,
      });
      (mockConfig.get as jest.Mock).mockImplementation(
        (key: string, defaultValue?: string) => {
          if (key === 'SUNAT_ENVIRONMENT') return AmbienteSunat.BETA;
          return defaultValue;
        },
      );

      const { proc, gateway, queue } = makeProcessor();
      // Doc 06 §1 — comunicar-baja vive en cola-baja con SunatBajaProcessor
      // que delega aquí. Llamamos al método público directo.
      await proc.comunicarBaja({ comunicacionBajaId: 'baja-1' });

      expect(gateway.sendSummary).toHaveBeenCalledTimes(1);
      // Persiste ticket SUNAT y xmlStorageKey (clave usa identificadorBaja)
      expect(mockPrisma.comunicacionBaja.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'baja-1' },
          data: expect.objectContaining({
            ticketSunat: 'TICKET-123',
            xmlStorageKey: 'sunat/bajas/RA-20260506-001.xml',
          }),
        }),
      );
      // Encola siguiente poll a 30s con intento=1
      expect((queue as unknown as { add: jest.Mock }).add).toHaveBeenCalledWith(
        'consultar-ticket-baja',
        expect.objectContaining({
          comunicacionBajaId: 'baja-1',
          intento: 1,
        }),
        expect.objectContaining({ delay: 30_000 }),
      );
    });

    it('consultar-ticket-baja PENDIENTE: re-encola con backoff y NO toca reverso', async () => {
      (mockPrisma.comunicacionBaja.findUnique as jest.Mock).mockResolvedValue({
        ...baseComunicacion,
        estado: EstadoComunicacionBaja.EN_PROCESO,
        ticketSunat: 'TICKET-123',
      });
      const gateway = {
        sendSummary: jest.fn(),
        getStatus: jest.fn().mockResolvedValue({
          accepted: false,
          codigoRespuesta: '98',
          mensaje: 'En proceso',
          requestPayload: {},
          responsePayload: {},
        }),
      };
      const { proc, queue } = makeProcessor({ gateway });

      await proc.consultarTicketBaja({
        comunicacionBajaId: 'baja-1',
        intento: 1,
      });

      // Re-encola siguiente intento usando primer escalón del ladder (30s, intento+1=2)
      expect((queue as unknown as { add: jest.Mock }).add).toHaveBeenCalledWith(
        'consultar-ticket-baja',
        expect.objectContaining({
          comunicacionBajaId: 'baja-1',
          intento: 2,
        }),
        expect.objectContaining({ delay: 30_000 }),
      );
      expect(
        mockVentaReversoFiscal.aplicarReversoPorBajaFiscal,
      ).not.toHaveBeenCalled();
    });

    it('consultar-ticket-baja no rechaza por deadline si el RA ya tiene ticket', async () => {
      (mockPrisma.comunicacionBaja.findUnique as jest.Mock).mockResolvedValue({
        ...baseComunicacion,
        estado: EstadoComunicacionBaja.EN_PROCESO,
        ticketSunat: 'TICKET-123',
      });
      const gateway = {
        sendSummary: jest.fn(),
        getStatus: jest.fn().mockResolvedValue({
          accepted: false,
          codigoRespuesta: '98',
          mensaje: 'En proceso',
          requestPayload: {},
          responsePayload: {},
        }),
      };
      const { proc, queue } = makeProcessor({ gateway });

      await proc.consultarTicketBaja({
        comunicacionBajaId: 'baja-1',
        intento: 1,
        deadline: new Date(Date.now() - 60_000).toISOString(),
      });

      expect(gateway.getStatus).toHaveBeenCalledTimes(1);
      expect(mockPrisma.comunicacionBaja.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: EstadoComunicacionBaja.RECHAZADA,
          }),
        }),
      );
      expect((queue as unknown as { add: jest.Mock }).add).toHaveBeenCalledWith(
        'consultar-ticket-baja',
        expect.objectContaining({ intento: 2 }),
        expect.objectContaining({ delay: 30_000 }),
      );
    });

    it('consultar-ticket-baja ACEPTADA: marca venta ANULADA_FISCAL sin reverso comercial y emite evento', async () => {
      (mockPrisma.comunicacionBaja.findUnique as jest.Mock).mockResolvedValue({
        ...baseComunicacion,
        estado: EstadoComunicacionBaja.EN_PROCESO,
        ticketSunat: 'TICKET-123',
      });
      const gateway = {
        sendSummary: jest.fn(),
        getStatus: jest.fn().mockResolvedValue({
          accepted: true,
          codigoRespuesta: '0',
          mensaje: 'Aceptado',
          cdrContent: Buffer.from('cdr-bytes').toString('base64'),
          requestPayload: {},
          responsePayload: {},
        }),
      };

      const callOrder: string[] = [];
      (mockPrisma.venta.update as jest.Mock).mockImplementation(() => {
        callOrder.push('venta-anulada-fiscal');
        return Promise.resolve();
      });
      (mockPrisma.comprobanteEnvioLog.create as jest.Mock).mockImplementation(
        ({ data }: { data: { tipoEvento: string } }) => {
          // Doc 06 §10 — el log de baja aceptada usa el evento canónico
          // BAJA_RESUELTA (antes 'COMUNICACION_BAJA_ACEPTADA' legacy).
          if (data.tipoEvento === 'BAJA_RESUELTA') {
            callOrder.push('log-aceptada');
          }
          return Promise.resolve();
        },
      );

      const { proc } = makeProcessor({ gateway });

      await proc.consultarTicketBaja({
        comunicacionBajaId: 'baja-1',
        intento: 2,
      });

      expect(
        mockVentaReversoFiscal.aplicarReversoPorBajaFiscal,
      ).not.toHaveBeenCalled();
      expect(mockPrisma.venta.update).toHaveBeenCalledWith({
        where: { id: 'venta-1' },
        data: { estadoFacturacion: EstadoFacturacionVenta.ANULADA_FISCAL },
      });
      expect(callOrder).toEqual(['venta-anulada-fiscal', 'log-aceptada']);
      expect(mockPrisma.comprobante.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comp-1' },
          data: expect.objectContaining({
            estado: EstadoComprobante.ANULADO,
          }),
        }),
      );
      // Emitió evento socket de aceptación a roles ADMIN/ENCARGADO
      expect(mockEvents.emitToRoles).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ comunicacionBajaId: 'baja-1' }),
      );
    });

    it('consultar-ticket-baja RECHAZADA: deja comprobante en ACEPTADO y NO llama reverso', async () => {
      (mockPrisma.comunicacionBaja.findUnique as jest.Mock).mockResolvedValue({
        ...baseComunicacion,
        estado: EstadoComunicacionBaja.EN_PROCESO,
        ticketSunat: 'TICKET-123',
      });
      const gateway = {
        sendSummary: jest.fn(),
        getStatus: jest.fn().mockResolvedValue({
          accepted: false,
          codigoRespuesta: '2200',
          mensaje: 'Rechazado por SUNAT',
          requestPayload: {},
          responsePayload: {},
        }),
      };
      // El branch RECHAZADA exige cdrContent vacío y accepted=false sin codigo '98'
      // pero el guard stillProcessing usa codigoRespuesta!=='98' && !accepted && !cdrContent.
      // Para forzar rechazo, debemos hacer stillProcessing=false: aquí codigo!='98' y !cdrContent ⇒ stillProcessing=true.
      // Por lo tanto pasamos cdrContent presente para que no se considere "still processing".
      gateway.getStatus = jest.fn().mockResolvedValue({
        accepted: false,
        codigoRespuesta: '2200',
        mensaje: 'Rechazado por SUNAT',
        cdrContent: Buffer.from('cdr-rechazo').toString('base64'),
        requestPayload: {},
        responsePayload: {},
      });

      const { proc } = makeProcessor({ gateway });
      await proc.consultarTicketBaja({
        comunicacionBajaId: 'baja-1',
        intento: 1,
      });

      // Comprobante restaurado a ACEPTADO
      expect(mockPrisma.comprobante.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comp-1' },
          data: expect.objectContaining({
            estado: EstadoComprobante.ACEPTADO,
          }),
        }),
      );
      // Comunicación marcada como RECHAZADA
      expect(mockPrisma.comunicacionBaja.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'baja-1' },
          data: expect.objectContaining({
            estado: EstadoComunicacionBaja.RECHAZADA,
          }),
        }),
      );
      expect(
        mockVentaReversoFiscal.aplicarReversoPorBajaFiscal,
      ).not.toHaveBeenCalled();
      // Variable de tipo enum no usada
      void EstadoFacturacionVenta;
    });
  });
});
