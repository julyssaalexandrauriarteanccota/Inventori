import { Injectable, Logger } from '@nestjs/common';
import {
  ItemValidacion,
  NivelValidacion,
  ReglaConfigurableId,
  REGLAS_CONFIGURABLES_LABELS,
  ReglasValidacionConfig,
  ResultadoValidacion,
  EstadoVenta,
  TipoDocumento,
  isSunatUnidadMedidaAlias,
  isSunatUnidadMedidaCode,
  normalizeSunatUnidadMedidaCode,
  resolverReglasConfigurables,
} from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';

interface ValidarInput {
  ventaId: string;
  tipo: TipoDocumento;
}

interface VentaContexto {
  id: string;
  estado: unknown;
  subtotal: unknown;
  total: unknown;
  cliente: {
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
  } | null;
  detalles: Array<{
    cantidad: number;
    precioUnitario: unknown;
    productoId: string;
    producto?: {
      id: string;
      nombre: string;
      tipo?: string | null;
      manejaInventario: boolean;
      unidadMedida?: { codigo?: string | null } | null;
      almacenStocks?: Array<{ cantidad: number }>;
    };
  }>;
}

const RUC_VALIDACION_CACHE_DAYS = 30;

/**
 * Doc 10 §6/§7 — pipeline único de validación pre-emisión.
 *
 * Reglas obligatorias siempre son BLOQUEANTE; reglas configurables se leen de
 * `ConfigEmpresaFiscal.reglasValidacion` (overrides parciales) y se resuelven
 * contra los defaults publicados en `@erp/shared`.
 *
 * Este servicio es idempotente y read-only: NO toma correlativo ni modifica
 * datos. Se invoca antes de abrir la transacción de emisión.
 */
@Injectable()
export class ValidacionFiscalService {
  private readonly logger = new Logger(ValidacionFiscalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validar(input: ValidarInput): Promise<ResultadoValidacion> {
    const venta = (await this.prisma.venta.findUnique({
      where: { id: input.ventaId },
      include: {
        cliente: {
          include: {
            contactos: {
              orderBy: { fecha: 'desc' },
              select: { id: true },
              take: 1,
            },
          },
        },
        detalles: {
          include: {
            producto: {
              select: {
                id: true,
                nombre: true,
                tipo: true,
                manejaInventario: true,
                unidadMedida: { select: { codigo: true } },
                almacenStocks: { select: { cantidad: true } },
              },
            },
          },
        },
      },
    })) as VentaContexto | null;

    const bloqueantes: ItemValidacion[] = [];
    const advertencias: ItemValidacion[] = [];

    if (!venta) {
      bloqueantes.push({
        reglaId: 'venta_existe',
        mensaje: `Venta ${input.ventaId} no encontrada`,
      });
      return { bloqueantes, advertencias };
    }

    const total = Number(venta.total ?? venta.subtotal ?? 0);

    // ── Reglas obligatorias (Doc 10 §6 tabla 1) ────────────────────────
    this.evaluarReglasObligatorias(venta, input.tipo, total, bloqueantes);
    await this.evaluarConfiguracionEmpresa(bloqueantes);

    // ── Reglas configurables (Doc 10 §6 tabla 2) ───────────────────────
    const configFiscal = await this.prisma.configEmpresaFiscal.findFirst({
      select: { reglasValidacion: true },
    });
    const reglas = resolverReglasConfigurables(
      (configFiscal?.reglasValidacion ?? null) as ReglasValidacionConfig | null,
    );
    await this.evaluarReglasConfigurables(
      venta,
      input.tipo,
      total,
      reglas,
      bloqueantes,
      advertencias,
    );

    return { bloqueantes, advertencias };
  }

  private evaluarReglasObligatorias(
    venta: VentaContexto,
    tipo: TipoDocumento,
    total: number,
    bloqueantes: ItemValidacion[],
  ): void {
    const cliente = venta.cliente;

    if (!cliente) {
      bloqueantes.push({
        reglaId: 'cliente_existe',
        mensaje: 'La venta no tiene cliente asociado',
      });
      return;
    }

    if (tipo === TipoDocumento.FACTURA) {
      const ruc = cliente.ruc?.trim() ?? '';
      if (!isSunatRuc(ruc)) {
        bloqueantes.push({
          reglaId: 'cliente_ruc_valido_factura',
          mensaje:
            'La factura requiere un RUC SUNAT válido en el cliente receptor',
          enlaceCorreccion: this.enlaceCliente(cliente.id),
        });
      }
      if (!cliente.razonSocial || cliente.razonSocial.trim().length === 0) {
        bloqueantes.push({
          reglaId: 'cliente_razon_social_factura',
          mensaje: 'La factura requiere razón social del cliente',
          enlaceCorreccion: this.enlaceCliente(cliente.id),
        });
      }
      if (!cliente.direccion || cliente.direccion.trim().length === 0) {
        bloqueantes.push({
          reglaId: 'cliente_direccion_factura',
          mensaje: 'La factura requiere dirección fiscal del cliente',
          enlaceCorreccion: this.enlaceCliente(cliente.id),
        });
      }
    }

    if (tipo === TipoDocumento.BOLETA && total >= 700) {
      const tieneDoc =
        (cliente.dni && cliente.dni.trim().length > 0) ||
        (cliente.ruc && cliente.ruc.trim().length > 0);
      if (!tieneDoc) {
        bloqueantes.push({
          reglaId: 'cliente_doc_boleta_alta',
          mensaje:
            'Boletas ≥ S/ 700 requieren DNI o RUC del receptor (obligación SUNAT)',
          enlaceCorreccion: this.enlaceCliente(cliente.id),
        });
      }
    }

    venta.detalles.forEach((d, idx) => {
      if (Number(d.cantidad) <= 0) {
        bloqueantes.push({
          reglaId: 'linea_cantidad_positiva',
          mensaje: `Línea ${idx + 1}: la cantidad debe ser mayor que cero`,
        });
      }
      if (Number(d.precioUnitario) <= 0) {
        bloqueantes.push({
          reglaId: 'linea_precio_positivo',
          mensaje: `Línea ${idx + 1}: el precio unitario debe ser mayor que cero`,
        });
      }
      if (!d.producto?.unidadMedida?.codigo) {
        bloqueantes.push({
          reglaId: 'linea_unidad_medida_cat03',
          mensaje: `Línea ${idx + 1}: el producto no tiene unidad de medida SUNAT configurada`,
        });
      }
    });
  }

  private async evaluarConfiguracionEmpresa(
    bloqueantes: ItemValidacion[],
  ): Promise<void> {
    const [configFiscal, certificadoActivo, credenciales] = await Promise.all([
      this.prisma.configEmpresaFiscal.findFirst({
        select: { ambienteDefault: true },
      }),
      this.prisma.certificadoDigital.findFirst({
        where: { activo: true, revokedAt: null, deletedAt: null },
        select: { id: true, validoHasta: true },
      }),
      this.prisma.fiscalSecret.findMany({
        where: {
          scope: 'sunat-direct:sol-credentials',
          name: { in: ['sol-username', 'sol-user', 'sol-password'] },
          deletedAt: null,
        },
        select: { name: true },
      }),
    ]);

    if (!configFiscal?.ambienteDefault) {
      bloqueantes.push({
        reglaId: 'empresa_ambiente_definido',
        mensaje: 'La empresa no tiene ambiente SUNAT definido',
        enlaceCorreccion: {
          label: 'Configurar tributario',
          url: '/configuracion/tributario',
        },
      });
    }

    if (
      !certificadoActivo ||
      !certificadoActivo.validoHasta ||
      certificadoActivo.validoHasta < new Date()
    ) {
      bloqueantes.push({
        reglaId: 'empresa_certificado_vigente',
        mensaje: certificadoActivo
          ? 'El certificado digital activo está vencido'
          : 'La empresa no tiene certificado digital activo',
        enlaceCorreccion: {
          label: 'Configurar certificado',
          url: '/configuracion/tributario/certificado',
        },
      });
    }

    const credentialNames = new Set(credenciales.map((item) => item.name));
    const hasDbCredentials =
      (credentialNames.has('sol-username') ||
        credentialNames.has('sol-user')) &&
      credentialNames.has('sol-password');

    const hasEnvCredentials =
      (!!process.env.SUNAT_SOL_USERNAME || !!process.env.SUNAT_SOL_USER) &&
      !!process.env.SUNAT_SOL_PASSWORD;

    if (!hasDbCredentials && !hasEnvCredentials) {
      bloqueantes.push({
        reglaId: 'empresa_credenciales_sol_configuradas',
        mensaje: 'La empresa no tiene credenciales SOL configuradas',
        enlaceCorreccion: {
          label: 'Configurar credenciales SOL',
          url: '/configuracion/tributario/credenciales-sol',
        },
      });
    }
  }

  private async evaluarReglasConfigurables(
    venta: VentaContexto,
    tipo: TipoDocumento,
    total: number,
    reglas: Record<ReglaConfigurableId, NivelValidacion>,
    bloqueantes: ItemValidacion[],
    advertencias: ItemValidacion[],
  ): Promise<void> {
    const push = (
      reglaId: ReglaConfigurableId,
      mensaje: string,
      enlace?: ItemValidacion['enlaceCorreccion'],
    ) => {
      const item: ItemValidacion = {
        reglaId,
        mensaje,
        ...(enlace ? { enlaceCorreccion: enlace } : {}),
      };
      if (reglas[reglaId] === NivelValidacion.BLOQUEANTE)
        bloqueantes.push(item);
      else advertencias.push(item);
    };

    // Total > 0
    if (total <= 0) {
      push(
        ReglaConfigurableId.TOTAL_COMPROBANTE_POSITIVO,
        REGLAS_CONFIGURABLES_LABELS[
          ReglaConfigurableId.TOTAL_COMPROBANTE_POSITIVO
        ] + ` (actual: S/ ${total.toFixed(2)})`,
      );
    }

    if (!venta.cliente) return;
    const cliente = venta.cliente;

    // Cliente contactable: email, teléfono/celular o un contacto registrado.
    const tieneContacto =
      hasText(cliente.email) ||
      hasText(cliente.telefono) ||
      hasText(cliente.celular) ||
      (cliente.contactos?.length ?? 0) > 0;
    if (!tieneContacto) {
      push(
        ReglaConfigurableId.CLIENTE_CON_EMAIL,
        'El cliente no tiene email, teléfono ni contacto registrado para enviar o coordinar el comprobante',
        this.enlaceCliente(cliente.id),
      );
    }

    const stockYaFueDescontado = [
      EstadoVenta.ORDEN_CONFIRMADA,
      EstadoVenta.ENTREGADA,
    ].includes(venta.estado as EstadoVenta);

    if (!stockYaFueDescontado) {
      for (const detalle of venta.detalles) {
        const producto = detalle.producto;
        if (!producto?.manejaInventario) continue;

        const stockDisponible = (producto.almacenStocks ?? []).reduce(
          (sum, item) => sum + Number(item.cantidad ?? 0),
          0,
        );
        if (stockDisponible < Number(detalle.cantidad)) {
          push(
            ReglaConfigurableId.STOCK_DISPONIBLE_AL_EMITIR,
            `Producto "${producto.nombre}" sin stock suficiente para emitir (stock: ${stockDisponible}, requerido: ${detalle.cantidad})`,
            { label: 'Ver producto', url: `/productos/${producto.id}` },
          );
        }
      }
    }

    for (const detalle of venta.detalles) {
      const producto = detalle.producto;
      const unidadCodigo = producto?.unidadMedida?.codigo?.trim();
      if (unidadCodigo && isSunatUnidadMedidaCode(unidadCodigo)) continue;

      const fallback = producto?.tipo === 'SERVICIO' ? 'ZZ' : 'NIU';
      const unidadNormalizada = normalizeSunatUnidadMedidaCode(
        unidadCodigo,
        fallback,
      );
      const mensaje = unidadCodigo
        ? `Producto "${producto?.nombre ?? detalle.productoId}" usa unidad "${unidadCodigo}", que SUNAT no acepta en unitCode. Usa ${unidadNormalizada} (${fallback === 'ZZ' ? 'servicio' : 'bien físico'}).`
        : `Producto "${producto?.nombre ?? detalle.productoId}" no tiene unidad SUNAT. Usa ${unidadNormalizada} (${fallback === 'ZZ' ? 'servicio' : 'bien físico'}).`;
      const item: ItemValidacion = {
        reglaId: 'producto_unidad_sunat_valida',
        mensaje,
        ...(producto?.id
          ? {
              enlaceCorreccion: {
                label: 'Ver producto',
                url: `/productos/${producto.id}`,
              },
            }
          : {}),
      };

      if (unidadCodigo && isSunatUnidadMedidaAlias(unidadCodigo)) {
        advertencias.push(item);
      } else {
        bloqueantes.push(item);
      }
    }

    // Reglas que aplican solo a FACTURA con RUC
    if (tipo === TipoDocumento.FACTURA && cliente.ruc) {
      const validacion = await this.prisma.clienteValidacionSunat.findUnique({
        where: {
          tipoDocumentoSunat_numeroDocumento: {
            tipoDocumentoSunat: '6',
            numeroDocumento: cliente.ruc,
          },
        },
      });

      if (!validacion) {
        push(
          ReglaConfigurableId.RUC_VALIDADO_RECIENTEMENTE,
          'El RUC del receptor nunca fue validado contra el padrón SUNAT',
          this.enlaceCliente(cliente.id),
        );
      } else {
        if (validacion.estado !== 'ACTIVO') {
          push(
            ReglaConfigurableId.RUC_RECEPTOR_ACTIVO_SUNAT,
            `El RUC del receptor figura como ${validacion.estado} en SUNAT`,
            this.enlaceCliente(cliente.id),
          );
        }
        if (
          validacion.condicionDomicilio &&
          validacion.condicionDomicilio !== 'HABIDO'
        ) {
          push(
            ReglaConfigurableId.RUC_RECEPTOR_HABIDO_SUNAT,
            `El RUC del receptor figura como ${validacion.condicionDomicilio} en SUNAT`,
            this.enlaceCliente(cliente.id),
          );
        }
        if (
          validacion.ultimaValidacionAt &&
          this.diasDesde(validacion.ultimaValidacionAt) >
            RUC_VALIDACION_CACHE_DAYS
        ) {
          push(
            ReglaConfigurableId.RUC_VALIDADO_RECIENTEMENTE,
            `Última validación contra padrón hace ${this.diasDesde(validacion.ultimaValidacionAt)} días`,
            this.enlaceCliente(cliente.id),
          );
        }
        if (
          cliente.razonSocial &&
          validacion.nombreNormalizado &&
          this.normalizar(cliente.razonSocial) !==
            this.normalizar(validacion.nombreNormalizado)
        ) {
          push(
            ReglaConfigurableId.RAZON_SOCIAL_COINCIDE_PADRON,
            `La razón social registrada no coincide con el padrón SUNAT (padrón: "${validacion.nombreNormalizado}")`,
            this.enlaceCliente(cliente.id),
          );
        }
      }
    }
  }

  private enlaceCliente(clienteId: string): ItemValidacion['enlaceCorreccion'] {
    return { label: 'Editar cliente', url: `/clientes/${clienteId}` };
  }

  private diasDesde(fecha: Date): number {
    const ms = Date.now() - fecha.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  private normalizar(s: string): string {
    return s
      .toUpperCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

function hasText(value: string | null | undefined): boolean {
  return !!value?.trim();
}

function isSunatRuc(value: string): boolean {
  if (!/^(10|15|17|20)\d{9}$/.test(value)) return false;
  const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = factors.reduce(
    (total, factor, index) => total + Number(value[index]) * factor,
    0,
  );
  const remainder = sum % 11;
  const check = remainder < 2 ? remainder : 11 - remainder;
  return check === Number(value[10]);
}
