import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { BASE_TIPOS_MOVIMIENTO } from '@erp/shared';
import type { AuditoriaWhereInput } from '../../../generated/prisma/models/Auditoria';
import { PrismaService } from '../../database/prisma.service';
import { UpdateConfigEmpresaDto } from '../facturacion/dto/update-config-empresa.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { CreateMetodoPagoDto } from './dto/create-metodo-pago.dto';
import { CreateTipoMovimientoConfigDto } from './dto/create-tipo-movimiento-config.dto';
import { UpdateMetodoPagoDto } from './dto/update-metodo-pago.dto';
import { UpdateTipoMovimientoConfigDto } from './dto/update-tipo-movimiento-config.dto';
import { QueryAuditoriaDto } from './dto/query-auditoria.dto';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════
  //  CONFIGURACIÓN DE EMPRESA
  // ═══════════════════════════════════════════

  async getEmpresa() {
    const config = await this.prisma.configEmpresa.findFirst();
    if (!config) {
      throw new NotFoundException(
        'Configuración de empresa no encontrada. Ejecute el seed.',
      );
    }
    return config;
  }

  async getEmpresaPublica() {
    const config = await this.prisma.configEmpresa.findFirst({
      select: {
        razonSocial: true,
        ruc: true,
        direccion: true,
        telefono: true,
        email: true,
        logo: true,
        nombreComercial: true,
        slogan: true,
        descripcionCorta: true,
        descripcionSeo: true,
        rubro: true,
        website: true,
        telefonoVentas: true,
        telefonoSoporte: true,
        whatsapp: true,
        emailVentas: true,
        emailSoporte: true,
        logoDark: true,
        favicon: true,
        colorPrimario: true,
        colorSecundario: true,
        heroTitulo: true,
        heroSubtitulo: true,
        catalogoDescripcion: true,
        contactoDescripcion: true,
        garantiaDescripcion: true,
        ticketDescripcion: true,
        pwaDescripcion: true,
      },
    });
    if (!config) {
      throw new NotFoundException('Configuración de empresa no encontrada.');
    }
    return { data: config, meta: { timestamp: new Date().toISOString() } };
  }

  async updateEmpresa(dto: UpdateConfigEmpresaDto) {
    const config = await this.prisma.configEmpresa.findFirst();
    if (!config) {
      throw new NotFoundException(
        'Configuración de empresa no encontrada. Ejecute el seed.',
      );
    }
    return this.prisma.configEmpresa.update({
      where: { id: config.id },
      data: {
        razonSocial: dto.razonSocial,
        ruc: dto.ruc,
        direccion: dto.direccion,
        telefono: dto.telefono,
        email: dto.email,
        logo: dto.logo,
        nombreComercial: dto.nombreComercial,
        slogan: dto.slogan,
        descripcionCorta: dto.descripcionCorta,
        descripcionSeo: dto.descripcionSeo,
        rubro: dto.rubro,
        website: dto.website,
        telefonoVentas: dto.telefonoVentas,
        telefonoSoporte: dto.telefonoSoporte,
        whatsapp: dto.whatsapp,
        emailVentas: dto.emailVentas,
        emailSoporte: dto.emailSoporte,
        logoDark: dto.logoDark,
        favicon: dto.favicon,
        colorPrimario: dto.colorPrimario,
        colorSecundario: dto.colorSecundario,
        heroTitulo: dto.heroTitulo,
        heroSubtitulo: dto.heroSubtitulo,
        catalogoDescripcion: dto.catalogoDescripcion,
        contactoDescripcion: dto.contactoDescripcion,
        garantiaDescripcion: dto.garantiaDescripcion,
        ticketDescripcion: dto.ticketDescripcion,
        pwaDescripcion: dto.pwaDescripcion,
        porcentajeIGV: dto.porcentajeIGV,
      },
    });
  }

  // ═══════════════════════════════════════════
  //  SERIES DE DOCUMENTOS
  // ═══════════════════════════════════════════

  async getSeries() {
    const config = await this.prisma.configEmpresa.findFirst({
      select: {
        id: true,
        serieFactura: true,
        serieBoleta: true,
        serieNotaCredito: true,
        serieNotaDebito: true,
        correlativoFactura: true,
        correlativoBoleta: true,
        correlativoNotaCredito: true,
        correlativoNotaDebito: true,
      },
    });
    if (!config) {
      throw new NotFoundException(
        'Configuración de empresa no encontrada. Ejecute el seed.',
      );
    }
    return config;
  }

  async updateSeries(dto: UpdateSeriesDto) {
    const config = await this.prisma.configEmpresa.findFirst();
    if (!config) {
      throw new NotFoundException(
        'Configuración de empresa no encontrada. Ejecute el seed.',
      );
    }
    return this.prisma.configEmpresa.update({
      where: { id: config.id },
      data: {
        serieFactura: dto.serieFactura,
        serieBoleta: dto.serieBoleta,
        serieNotaCredito: dto.serieNotaCredito,
        serieNotaDebito: dto.serieNotaDebito,
      },
      select: {
        id: true,
        serieFactura: true,
        serieBoleta: true,
        serieNotaCredito: true,
        serieNotaDebito: true,
        correlativoFactura: true,
        correlativoBoleta: true,
        correlativoNotaCredito: true,
        correlativoNotaDebito: true,
      },
    });
  }

  // ═══════════════════════════════════════════
  //  MÉTODOS DE PAGO
  // ═══════════════════════════════════════════

  async findAllMetodosPago() {
    return this.prisma.metodoPago.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  async createMetodoPago(dto: CreateMetodoPagoDto) {
    const existing = await this.prisma.metodoPago.findUnique({
      where: { codigo: dto.codigo },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un método de pago con código '${dto.codigo}'`,
      );
    }
    return this.prisma.metodoPago.create({ data: dto });
  }

  async updateMetodoPago(id: string, dto: UpdateMetodoPagoDto) {
    const metodo = await this.prisma.metodoPago.findUnique({ where: { id } });
    if (!metodo) {
      throw new NotFoundException(`Método de pago ${id} no encontrado`);
    }
    if (dto.codigo && dto.codigo !== metodo.codigo) {
      const existing = await this.prisma.metodoPago.findUnique({
        where: { codigo: dto.codigo },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe un método de pago con código '${dto.codigo}'`,
        );
      }
    }
    return this.prisma.metodoPago.update({ where: { id }, data: dto });
  }

  async deleteMetodoPago(id: string) {
    const metodo = await this.prisma.metodoPago.findUnique({ where: { id } });
    if (!metodo) {
      throw new NotFoundException(`Método de pago ${id} no encontrado`);
    }

    const [ventasCount, movimientosCajaCount] = await Promise.all([
      this.prisma.venta.count({
        where: { metodoPagoId: id, deletedAt: null },
      }),
      this.prisma.movimientoCaja.count({
        where: { metodoPagoId: id },
      }),
    ]);

    if (ventasCount > 0 || movimientosCajaCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar este método de pago porque ya fue usado. Déjalo inactivo si ya no debe aparecer.',
      );
    }

    return this.prisma.metodoPago.delete({ where: { id } });
  }

  // ═══════════════════════════════════════════
  //  TIPOS DE MOVIMIENTO
  // ═══════════════════════════════════════════

  private getTiposMovimientoDefaults() {
    return BASE_TIPOS_MOVIMIENTO.map((tipo, index) => ({
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      orden: index + 1,
      activo: true,
      comportamiento: tipo.comportamiento,
      requiereJustificacion: tipo.requiereJustificacion,
      requiereEvidencia: tipo.requiereEvidencia,
      disponibleTecnico: tipo.disponibleTecnico,
    }));
  }

  private isBaseTipoMovimiento(codigo: string) {
    return BASE_TIPOS_MOVIMIENTO.some((item) => String(item.codigo) === codigo);
  }

  private slugifyTipoMovimientoCode(nombre: string) {
    return nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50);
  }

  private async generateTipoMovimientoCode(nombre: string) {
    const base = this.slugifyTipoMovimientoCode(nombre) || 'TIPO_MOVIMIENTO';
    let candidate = base;
    let attempt = 2;

    while (
      await this.prisma.tipoMovimientoConfig.findUnique({
        where: { codigo: candidate },
      })
    ) {
      candidate = `${base}_${attempt}`;
      attempt += 1;
    }

    return candidate;
  }

  private validateTipoMovimientoRules(
    comportamiento: string,
    requiereEvidencia: boolean,
  ) {
    if (requiereEvidencia && comportamiento !== 'SALIDA') {
      throw new BadRequestException(
        'La evidencia solo aplica a movimientos de salida',
      );
    }
  }

  private async ensureTiposMovimientoConfig() {
    const defaults = this.getTiposMovimientoDefaults();
    const existing = await this.prisma.tipoMovimientoConfig.findMany({
      select: { codigo: true },
    });
    const existingCodes = new Set(
      existing.map((item: { codigo: string }) => item.codigo),
    );
    const missing = defaults.filter((item) => !existingCodes.has(item.codigo));

    if (missing.length > 0) {
      await this.prisma.tipoMovimientoConfig.createMany({
        data: missing,
      });
    }
  }

  async findAllTiposMovimiento() {
    await this.ensureTiposMovimientoConfig();

    return this.prisma.tipoMovimientoConfig.findMany({
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
  }

  async createTipoMovimiento(dto: CreateTipoMovimientoConfigDto) {
    await this.ensureTiposMovimientoConfig();
    this.validateTipoMovimientoRules(
      dto.comportamiento,
      dto.requiereEvidencia ?? false,
    );

    const codigo = await this.generateTipoMovimientoCode(dto.nombre);

    return this.prisma.tipoMovimientoConfig.create({
      data: {
        codigo,
        nombre: dto.nombre.trim(),
        activo: dto.activo ?? true,
        orden:
          dto.orden ?? (await this.prisma.tipoMovimientoConfig.count()) + 1,
        comportamiento: dto.comportamiento,
        requiereJustificacion: dto.requiereJustificacion ?? false,
        requiereEvidencia: dto.requiereEvidencia ?? false,
        disponibleTecnico: dto.disponibleTecnico ?? false,
      },
    });
  }

  async updateTipoMovimiento(id: string, dto: UpdateTipoMovimientoConfigDto) {
    await this.ensureTiposMovimientoConfig();

    const tipo = await this.prisma.tipoMovimientoConfig.findUnique({
      where: { id },
    });

    if (!tipo) {
      throw new NotFoundException(`Tipo de movimiento ${id} no encontrado`);
    }

    this.validateTipoMovimientoRules(
      dto.comportamiento ?? tipo.comportamiento,
      dto.requiereEvidencia ?? tipo.requiereEvidencia,
    );

    return this.prisma.tipoMovimientoConfig.update({
      where: { id },
      data: {
        ...dto,
        nombre: dto.nombre?.trim(),
      },
    });
  }

  async deleteTipoMovimiento(id: string) {
    await this.ensureTiposMovimientoConfig();

    const tipo = await this.prisma.tipoMovimientoConfig.findUnique({
      where: { id },
    });

    if (!tipo) {
      throw new NotFoundException(`Tipo de movimiento ${id} no encontrado`);
    }

    if (this.isBaseTipoMovimiento(tipo.codigo)) {
      throw new BadRequestException('Los tipos base no se pueden eliminar');
    }

    await this.prisma.tipoMovimientoConfig.delete({
      where: { id },
    });
  }

  // ═══════════════════════════════════════════
  //  AUDITORÍA
  // ═══════════════════════════════════════════

  async findAllAuditoria(query: QueryAuditoriaDto) {
    const {
      page = 1,
      limit = 20,
      usuarioId,
      modelo,
      accion,
      fechaDesde,
      fechaHasta,
      search,
    } = query;
    const skip = (page - 1) * limit;

    const where: AuditoriaWhereInput = {};
    if (usuarioId) where.usuarioId = usuarioId;
    if (modelo) where.modelo = modelo;
    if (accion) where.accion = accion;
    if (search) {
      where.OR = [
        { modelo: { contains: search, mode: 'insensitive' } },
        { accion: { contains: search, mode: 'insensitive' } },
        { modeloId: { contains: search, mode: 'insensitive' } },
        {
          usuario: {
            is: { nombre: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          usuario: { is: { email: { contains: search, mode: 'insensitive' } } },
        },
      ];
    }
    if (fechaDesde || fechaHasta) {
      const createdAt: { gte?: Date; lt?: Date } = {};
      if (fechaDesde) createdAt.gte = new Date(fechaDesde);
      if (fechaHasta) {
        const nextDay = new Date(fechaHasta);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        createdAt.lt = nextDay;
      }
      where.createdAt = createdAt;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          usuario: { select: { id: true, nombre: true, email: true } },
        },
      }),
      this.prisma.auditoria.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findOneAuditoria(id: string) {
    const registro = await this.prisma.auditoria.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
      },
    });
    if (!registro) {
      throw new NotFoundException(`Registro de auditoría ${id} no encontrado`);
    }
    return registro;
  }
}
