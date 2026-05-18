import { Test } from '@nestjs/testing';
import {
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
};

const baseDetalle = {
  cantidad: 2,
  precioUnitario: 100,
  productoId: 'prod-1',
  producto: {
    id: 'prod-1',
    nombre: 'Producto prueba',
    manejaInventario: false,
    unidadMedida: { codigo: 'NIU' },
    almacenStocks: [],
  },
};

function buildPrisma(overrides: {
  ventaSubtotal?: number;
  cliente?: Partial<ClienteFixture> | null;
  detalles?: Array<Partial<typeof baseDetalle>>;
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
        subtotal: overrides.ventaSubtotal ?? 200,
        cliente:
          overrides.cliente === null
            ? null
            : { ...baseCliente, ...(overrides.cliente ?? {}) },
        detalles: (overrides.detalles ?? [baseDetalle]).map((d) => ({
          ...baseDetalle,
          ...d,
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
          { name: 'sol_username' },
          { name: 'sol_password' },
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
    const prisma = buildPrisma({ cliente: { email: null } });
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

  it('override de reglasValidacion convierte advertencia en bloqueante', async () => {
    const prisma = buildPrisma({
      cliente: { email: null },
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
});
