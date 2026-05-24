import { Test } from '@nestjs/testing';
import {
  EstadoVenta,
  NivelValidacion,
  ReglaConfigurableId,
  TipoDocumento,
} from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { ValidacionFiscalService } from './validacion-fiscal.service';

interface ClienteFixture {
  id: string;
  nombre: string | null;
  apellido: string | null;
  razonSocial: string | null;
  ruc: string | null;
  dni: string | null;
  direccion: string | null;
  email: string | null;
  telefono: string | null;
  celular: string | null;
  contactos?: Array<{ id: string }>;
}

const baseCliente: ClienteFixture = {
  id: 'cli-1',
  nombre: 'Juan',
  apellido: 'Pérez',
  razonSocial: 'EMPRESA EJEMPLO SAC',
  ruc: '20600055519',
  dni: null,
  direccion: 'Av. Cliente 123',
  email: 'cliente@example.com',
  telefono: null,
  celular: null,
  contactos: [],
};

const baseDetalle = {
  cantidad: 2,
  precioUnitario: 100,
  productoId: 'prod-1',
  producto: {
    id: 'prod-1',
    nombre: 'Producto prueba',
    tipo: 'REPUESTO',
    manejaInventario: false,
    unidadMedida: { codigo: 'NIU' },
    almacenStocks: [] as Array<{ cantidad: number }>,
  },
};

function buildPrisma(overrides: {
  ventaEstado?: EstadoVenta;
  ventaSubtotal?: number;
  ventaTotal?: number;
  cliente?: Partial<ClienteFixture> | null;
  detalles?: Array<
    Partial<Omit<typeof baseDetalle, 'producto'>> & {
      producto?: Partial<typeof baseDetalle.producto>;
    }
  >;
  configReglas?: Record<string, NivelValidacion> | null;
  validacionSunat?: {
    estado: string;
    condicionDomicilio?: string | null;
    nombreNormalizado?: string | null;
    ultimaValidacionAt?: Date | null;
  } | null;
}) {
  return {
    venta: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'venta-1',
        estado: overrides.ventaEstado ?? EstadoVenta.ORDEN_CONFIRMADA,
        subtotal: overrides.ventaSubtotal ?? 200,
        total: overrides.ventaTotal ?? overrides.ventaSubtotal ?? 200,
        cliente:
          overrides.cliente === null
            ? null
            : { ...baseCliente, ...(overrides.cliente ?? {}) },
        detalles: (overrides.detalles ?? [baseDetalle]).map((d) => ({
          ...baseDetalle,
          ...d,
          producto: {
            ...baseDetalle.producto,
            ...(d.producto ?? {}),
          },
        })),
      }),
    },
    configEmpresaFiscal: {
      findFirst: jest.fn().mockResolvedValue({
        ambienteDefault: 'BETA',
        reglasValidacion: overrides.configReglas ?? null,
      }),
    },
    clienteValidacionSunat: {
      findUnique: jest
        .fn()
        .mockResolvedValue(overrides.validacionSunat ?? null),
    },
    certificadoDigital: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'cert-1',
        validoHasta: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      }),
    },
    fiscalSecret: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { name: 'sol-username' },
          { name: 'sol-password' },
        ]),
    },
  } as unknown as PrismaService;
}

async function buildService(
  prisma: PrismaService,
): Promise<ValidacionFiscalService> {
  const mod = await Test.createTestingModule({
    providers: [
      ValidacionFiscalService,
      { provide: PrismaService, useValue: prisma },
    ],
  }).compile();
  return mod.get(ValidacionFiscalService);
}

describe('ValidacionFiscalService — Doc 10 §6/§7', () => {
  it('factura sin RUC válido → bloqueante (regla obligatoria)', async () => {
    const prisma = buildPrisma({ cliente: { ruc: '20123456789' } });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.FACTURA,
    });
    expect(
      r.bloqueantes.some((b) => b.reglaId === 'cliente_ruc_valido_factura'),
    ).toBe(true);
  });

  it('boleta ≥ 700 sin DNI ni RUC → bloqueante', async () => {
    const prisma = buildPrisma({
      cliente: { ruc: null, dni: null },
      ventaSubtotal: 1500,
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.BOLETA,
    });
    expect(
      r.bloqueantes.some((b) => b.reglaId === 'cliente_doc_boleta_alta'),
    ).toBe(true);
  });

  it('boleta < 700 sin DNI → no bloquea por documento', async () => {
    const prisma = buildPrisma({
      cliente: { ruc: null, dni: null },
      ventaSubtotal: 200,
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.BOLETA,
    });
    expect(
      r.bloqueantes.some((b) => b.reglaId === 'cliente_doc_boleta_alta'),
    ).toBe(false);
  });

  it('cantidad o precio ≤ 0 en línea → bloqueante', async () => {
    const prisma = buildPrisma({
      detalles: [
        { cantidad: 0, precioUnitario: 100 },
        { cantidad: 1, precioUnitario: 0 },
      ],
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.FACTURA,
    });
    expect(
      r.bloqueantes.some((b) => b.reglaId === 'linea_cantidad_positiva'),
    ).toBe(true);
    expect(
      r.bloqueantes.some((b) => b.reglaId === 'linea_precio_positivo'),
    ).toBe(true);
  });

  it('cliente sin email → advertencia (default ADVERTENCIA)', async () => {
    const prisma = buildPrisma({
      cliente: { email: null, telefono: null, celular: null, contactos: [] },
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.FACTURA,
    });
    expect(
      r.advertencias.some(
        (a) => a.reglaId === ReglaConfigurableId.CLIENTE_CON_EMAIL,
      ),
    ).toBe(true);
  });

  it('cliente sin email pero con teléfono → no advierte por contacto', async () => {
    const prisma = buildPrisma({
      cliente: { email: null, telefono: '908908889' },
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.BOLETA,
    });
    expect(
      r.advertencias.some(
        (a) => a.reglaId === ReglaConfigurableId.CLIENTE_CON_EMAIL,
      ),
    ).toBe(false);
  });

  it('override de reglasValidacion convierte advertencia en bloqueante', async () => {
    const prisma = buildPrisma({
      cliente: { email: null, telefono: null, celular: null, contactos: [] },
      configReglas: {
        [ReglaConfigurableId.CLIENTE_CON_EMAIL]: NivelValidacion.BLOQUEANTE,
      },
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.FACTURA,
    });
    expect(
      r.bloqueantes.some(
        (a) => a.reglaId === ReglaConfigurableId.CLIENTE_CON_EMAIL,
      ),
    ).toBe(true);
    expect(
      r.advertencias.some(
        (a) => a.reglaId === ReglaConfigurableId.CLIENTE_CON_EMAIL,
      ),
    ).toBe(false);
  });

  it('factura con RUC NO ACTIVO en padrón → bloqueante (default)', async () => {
    const prisma = buildPrisma({
      validacionSunat: {
        estado: 'BAJA_DEFINITIVA',
        condicionDomicilio: 'HABIDO',
        nombreNormalizado: 'EMPRESA EJEMPLO SAC',
        ultimaValidacionAt: new Date(),
      },
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.FACTURA,
    });
    expect(
      r.bloqueantes.some(
        (b) => b.reglaId === ReglaConfigurableId.RUC_RECEPTOR_ACTIVO_SUNAT,
      ),
    ).toBe(true);
  });

  it('factura con RUC NO HABIDO → advertencia (default)', async () => {
    const prisma = buildPrisma({
      validacionSunat: {
        estado: 'ACTIVO',
        condicionDomicilio: 'NO_HABIDO',
        nombreNormalizado: 'EMPRESA EJEMPLO SAC',
        ultimaValidacionAt: new Date(),
      },
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.FACTURA,
    });
    expect(
      r.advertencias.some(
        (a) => a.reglaId === ReglaConfigurableId.RUC_RECEPTOR_HABIDO_SUNAT,
      ),
    ).toBe(true);
  });

  it('factura con padrón inexistente → advertencia (RUC nunca validado)', async () => {
    const prisma = buildPrisma({ validacionSunat: null });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.FACTURA,
    });
    expect(
      r.advertencias.some(
        (a) => a.reglaId === ReglaConfigurableId.RUC_VALIDADO_RECIENTEMENTE,
      ),
    ).toBe(true);
  });

  it('factura con razón social distinta del padrón → advertencia', async () => {
    const prisma = buildPrisma({
      validacionSunat: {
        estado: 'ACTIVO',
        condicionDomicilio: 'HABIDO',
        nombreNormalizado: 'OTRA EMPRESA SAC',
        ultimaValidacionAt: new Date(),
      },
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.FACTURA,
    });
    expect(
      r.advertencias.some(
        (a) => a.reglaId === ReglaConfigurableId.RAZON_SOCIAL_COINCIDE_PADRON,
      ),
    ).toBe(true);
  });

  it('total ≤ 0 → bloqueante (regla configurable default BLOQUEANTE)', async () => {
    const prisma = buildPrisma({ ventaSubtotal: 0 });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.FACTURA,
    });
    expect(
      r.bloqueantes.some(
        (b) => b.reglaId === ReglaConfigurableId.TOTAL_COMPROBANTE_POSITIVO,
      ),
    ).toBe(true);
  });

  it('factura válida con padrón al día → 0 bloqueantes y 0 advertencias', async () => {
    const prisma = buildPrisma({
      validacionSunat: {
        estado: 'ACTIVO',
        condicionDomicilio: 'HABIDO',
        nombreNormalizado: 'EMPRESA EJEMPLO SAC',
        ultimaValidacionAt: new Date(),
      },
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.FACTURA,
    });
    expect(r.bloqueantes).toHaveLength(0);
    expect(r.advertencias).toHaveLength(0);
  });

  it('advierte cuando una unidad legacy se normalizará a código SUNAT', async () => {
    const prisma = buildPrisma({
      detalles: [
        {
          producto: {
            id: 'prod-1',
            nombre: 'Producto prueba',
            manejaInventario: false,
            unidadMedida: { codigo: 'UND' },
            almacenStocks: [],
          },
        },
      ],
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.BOLETA,
    });

    expect(
      r.advertencias.some((b) => b.reglaId === 'producto_unidad_sunat_valida'),
    ).toBe(true);
  });

  it('bloquea una unidad desconocida que SUNAT no acepta', async () => {
    const prisma = buildPrisma({
      detalles: [
        {
          producto: {
            id: 'prod-1',
            nombre: 'Producto prueba',
            manejaInventario: false,
            unidadMedida: { codigo: 'XYZ' },
            almacenStocks: [],
          },
        },
      ],
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.BOLETA,
    });

    expect(
      r.bloqueantes.some((b) => b.reglaId === 'producto_unidad_sunat_valida'),
    ).toBe(true);
  });

  it('venta ya confirmada no bloquea emisión por stock ya descontado', async () => {
    const prisma = buildPrisma({
      ventaEstado: EstadoVenta.ORDEN_CONFIRMADA,
      detalles: [
        {
          producto: {
            id: 'prod-1',
            nombre: 'Producto prueba',
            manejaInventario: true,
            unidadMedida: { codigo: 'NIU' },
            almacenStocks: [{ cantidad: 0 }],
          },
        },
      ],
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.BOLETA,
    });
    expect(
      r.bloqueantes.some(
        (b) => b.reglaId === ReglaConfigurableId.STOCK_DISPONIBLE_AL_EMITIR,
      ),
    ).toBe(false);
  });

  it('venta no confirmada mantiene bloqueo por stock insuficiente', async () => {
    const prisma = buildPrisma({
      ventaEstado: EstadoVenta.COTIZACION,
      detalles: [
        {
          producto: {
            id: 'prod-1',
            nombre: 'Producto prueba',
            manejaInventario: true,
            unidadMedida: { codigo: 'NIU' },
            almacenStocks: [{ cantidad: 0 }],
          },
        },
      ],
    });
    const svc = await buildService(prisma);
    const r = await svc.validar({
      ventaId: 'venta-1',
      tipo: TipoDocumento.BOLETA,
    });
    expect(
      r.bloqueantes.some(
        (b) => b.reglaId === ReglaConfigurableId.STOCK_DISPONIBLE_AL_EMITIR,
      ),
    ).toBe(true);
  });
});
