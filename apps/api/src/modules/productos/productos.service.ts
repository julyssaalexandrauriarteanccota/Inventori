import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RolUsuario, TipoMovimiento, TipoProducto } from '@erp/shared';
import type { ProductoProveedorUncheckedCreateInput } from '../../../generated/prisma/models/ProductoProveedor';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { InventarioService } from '../inventario/inventario.service';
import {
  CreateProductoDto,
  UpdateProductoDto,
  QueryProductoDto,
  CreateProductoProveedorDto,
  CreateCompatibilidadDto,
  StockInicialItemDto,
} from './dto';

@Injectable()
export class ProductosService {
  private readonly logger = new Logger(ProductosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventarioService: InventarioService,
  ) {}

  private inferTipoProducto(
    input: {
      tipo?: TipoProducto;
      tieneNumeroSerie?: boolean;
      esConsumible?: boolean;
    },
    fallbackTipo?: TipoProducto | string,
  ) {
    if (input.tipo) return input.tipo;
    if (input.tieneNumeroSerie) return TipoProducto.EQUIPO;
    if (input.esConsumible) return TipoProducto.INSUMO;
    return (fallbackTipo ?? TipoProducto.REPUESTO) as TipoProducto;
  }

  private getTipoSkuPrefix(tipo: TipoProducto) {
    const prefixes: Record<TipoProducto, string> = {
      [TipoProducto.EQUIPO]: 'EQ',
      [TipoProducto.REPUESTO]: 'REP',
      [TipoProducto.INSUMO]: 'INS',
      [TipoProducto.SERVICIO]: 'SER',
      [TipoProducto.ACCESORIO]: 'ACC',
    };

    return prefixes[tipo];
  }

  private getCategoriaSkuSegment(nombre?: string | null) {
    if (!nombre) {
      return 'GEN';
    }

    const normalized = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();

    return (normalized.slice(0, 3) || 'GEN').padEnd(3, 'X');
  }

  private async generateSku(
    tipo: TipoProducto,
    categoria?: { nombre?: string | null },
  ) {
    const prefix = `${this.getTipoSkuPrefix(tipo)}-${this.getCategoriaSkuSegment(categoria?.nombre)}`;
    const lastProduct = await this.prisma.producto.findFirst({
      where: {
        sku: { startsWith: `${prefix}-` },
      },
      orderBy: { sku: 'desc' },
      select: { sku: true },
    });

    const lastNumber = Number(lastProduct?.sku?.match(/-(\d+)$/)?.[1] ?? 0);
    return `${prefix}-${String(lastNumber + 1).padStart(4, '0')}`;
  }

  private normalizeProductoPayload(
    dto: CreateProductoDto | UpdateProductoDto,
    fallbackTipo?: TipoProducto | string,
  ) {
    const { imagenes, atributos, ...rest } = dto;
    const tipo = this.inferTipoProducto(dto, fallbackTipo);

    this.validateProductoFlags({ ...dto, tipo });

    const normalized = {
      ...rest,
      tipo,
    } as typeof rest & {
      tipo: TipoProducto;
      atributos?: Record<string, string> | null;
    };

    if (atributos !== undefined) {
      const map: Record<string, string> = {};
      for (const item of atributos) {
        const clave = item.clave?.trim();
        if (!clave) continue;
        map[clave] = (item.valor ?? '').trim();
      }
      normalized.atributos = Object.keys(map).length > 0 ? map : null;
    }

    switch (tipo) {
      case TipoProducto.SERVICIO:
        normalized.manejaInventario = false;
        normalized.tieneNumeroSerie = false;
        normalized.esConsumible = false;
        normalized.stockMinimo = 0;
        break;
      case TipoProducto.EQUIPO:
        normalized.manejaInventario = true;
        normalized.tieneNumeroSerie = true;
        normalized.esConsumible = false;
        break;
      case TipoProducto.INSUMO:
        normalized.manejaInventario = true;
        normalized.tieneNumeroSerie = false;
        normalized.esConsumible = true;
        break;
      case TipoProducto.REPUESTO:
      case TipoProducto.ACCESORIO:
        normalized.manejaInventario = true;
        normalized.tieneNumeroSerie = false;
        normalized.esConsumible = false;
        break;
    }

    return {
      data: normalized,
      imagenes,
    };
  }

  private normalizeImagenes(dto: CreateProductoDto | UpdateProductoDto) {
    const imagenes = [...(dto.imagenes ?? [])];

    if (dto.imagen && !imagenes.some((imagen) => imagen.url === dto.imagen)) {
      imagenes.unshift({
        url: dto.imagen,
        nombre: 'Imagen principal',
        esPrincipal: true,
        orden: 0,
      });
    }

    if (imagenes.length === 0) {
      return [];
    }

    const hasPrincipal = imagenes.some((imagen) => imagen.esPrincipal);
    return imagenes.map((imagen, index) => ({
      url: imagen.url.trim(),
      nombre: imagen.nombre?.trim() || null,
      tipo: imagen.tipo?.trim() || null,
      tamano: imagen.tamano ?? null,
      esPrincipal: hasPrincipal ? Boolean(imagen.esPrincipal) : index === 0,
      orden: imagen.orden ?? index,
    }));
  }

  private getImagenPrincipal(dto: CreateProductoDto | UpdateProductoDto) {
    const imagenes = this.normalizeImagenes(dto);
    return (
      imagenes.find((imagen) => imagen.esPrincipal)?.url ??
      imagenes[0]?.url ??
      dto.imagen
    );
  }

  private validateProductoFlags(input: {
    tipo?: TipoProducto;
    manejaInventario?: boolean;
    tieneNumeroSerie?: boolean;
    esConsumible?: boolean;
  }) {
    if (input.tipo === TipoProducto.SERVICIO) {
      if (input.manejaInventario) {
        throw new BadRequestException('Un servicio no puede manejar stock');
      }
      if (input.tieneNumeroSerie) {
        throw new BadRequestException(
          'Un servicio no puede tener número de serie',
        );
      }
      if (input.esConsumible) {
        throw new BadRequestException(
          'Un servicio no puede marcarse como consumible',
        );
      }
      return;
    }

    if (input.manejaInventario === false) {
      throw new BadRequestException(
        'Solo los servicios pueden quedar fuera de inventario',
      );
    }

    if (input.tipo !== TipoProducto.EQUIPO && input.tieneNumeroSerie) {
      throw new BadRequestException(
        'Solo los productos tipo EQUIPO pueden tener número de serie',
      );
    }

    if (input.tipo === TipoProducto.EQUIPO && input.esConsumible) {
      throw new BadRequestException('Un equipo no puede marcarse consumible');
    }

    if (input.tipo === TipoProducto.INSUMO && input.esConsumible === false) {
      throw new BadRequestException('Un insumo debe marcarse como consumible');
    }

    if (
      [TipoProducto.REPUESTO, TipoProducto.ACCESORIO].includes(
        input.tipo as TipoProducto,
      ) &&
      input.esConsumible
    ) {
      throw new BadRequestException(
        'Solo los productos tipo INSUMO pueden marcarse consumibles',
      );
    }
  }

  private normalizeCodigoQrProducto(
    tipo: TipoProducto,
    codigoQr: string | undefined,
    sku: string,
  ) {
    if (tipo === TipoProducto.EQUIPO) {
      return null;
    }

    return codigoQr?.trim() || `PRD:${sku}`;
  }

  private serializeProducto<
    T extends {
      modeloCatalogoId?: string | null;
      almacenStocks?: Array<{ cantidad: number }>;
      tipo?: TipoProducto | string;
      precioCompra?: unknown;
    },
  >(producto: T, userRol?: RolUsuario) {
    const { almacenStocks, ...rest } = producto;

    const serialized = {
      ...rest,
      modeloId: producto.modeloCatalogoId ?? null,
      stockActual: (almacenStocks ?? []).reduce(
        (total, stock) => total + stock.cantidad,
        0,
      ),
    };

    if (
      userRol &&
      userRol !== RolUsuario.ADMIN &&
      serialized.tipo === TipoProducto.SERVICIO
    ) {
      const { precioCompra: _precioCompra, ...withoutPrecioCompra } =
        serialized;
      void _precioCompra;
      return withoutPrecioCompra;
    }

    return serialized;
  }

  private async validateCategoria(categoriaId: string, tipo: TipoProducto) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
      select: { id: true, nombre: true, deletedAt: true, tipo: true },
    });

    if (!categoria || categoria.deletedAt) {
      throw new NotFoundException(`Categoría ${categoriaId} no encontrada`);
    }

    if ((categoria.tipo as TipoProducto) !== tipo) {
      throw new BadRequestException(
        'La categoría seleccionada no pertenece al tipo de producto',
      );
    }

    return categoria;
  }

  private async validateMarca(marcaId: string, tipo: TipoProducto) {
    const marca = await this.prisma.marca.findUnique({
      where: { id: marcaId },
      select: { id: true, deletedAt: true, tipos: true },
    });

    if (!marca || marca.deletedAt) {
      throw new NotFoundException(`Marca ${marcaId} no encontrada`);
    }

    if (!marca.tipos.includes(tipo)) {
      throw new BadRequestException(
        'La marca seleccionada no pertenece al tipo de producto',
      );
    }

    return marca;
  }

  private async validateModeloCatalogo(
    modeloId: string,
    tipo: TipoProducto,
    marcaId?: string | null,
  ) {
    const modelo = await this.prisma.modeloCatalogo.findFirst({
      where: {
        id: modeloId,
        deletedAt: null,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        marcaId: true,
      },
    });

    if (!modelo) {
      throw new NotFoundException(`Modelo ${modeloId} no encontrado`);
    }

    if ((modelo.tipo as TipoProducto) !== tipo) {
      throw new BadRequestException(
        'El modelo seleccionado no pertenece al tipo de producto',
      );
    }

    if (marcaId && modelo.marcaId && modelo.marcaId !== marcaId) {
      throw new BadRequestException(
        'El modelo seleccionado pertenece a una marca distinta',
      );
    }

    return modelo;
  }

  async suggestSku(tipo = TipoProducto.REPUESTO, categoriaId?: string) {
    const categoria = categoriaId
      ? await this.validateCategoria(categoriaId, tipo)
      : undefined;

    return {
      sku: await this.generateSku(tipo, categoria),
    };
  }

  async create(dto: CreateProductoDto, userId?: string, userRol?: RolUsuario) {
    const { data, imagenes } = this.normalizeProductoPayload(dto);
    this.validateProductoFlags(data);

    if (dto.stockInicial?.length && data.manejaInventario === false) {
      throw new BadRequestException(
        'No se puede registrar stock inicial para un producto que no maneja inventario',
      );
    }
    if (
      dto.stockInicial?.length &&
      (data.tipo === TipoProducto.EQUIPO || data.tieneNumeroSerie)
    ) {
      throw new BadRequestException(
        'Los equipos no tienen stock inicial en Productos; registra las unidades físicas desde Equipos',
      );
    }

    const categoria = await this.validateCategoria(
      data.categoriaId!,
      data.tipo,
    );
    data.sku =
      data.sku?.trim() || (await this.generateSku(data.tipo, categoria));

    const existingSku = await this.prisma.producto.findFirst({
      where: { sku: data.sku, deletedAt: null },
    });
    if (existingSku) {
      throw new ConflictException('Ya existe un producto con este SKU');
    }

    const selectedModelo = data.modeloId
      ? await this.validateModeloCatalogo(
          data.modeloId,
          data.tipo,
          data.marcaId ?? null,
        )
      : null;

    if (!data.marcaId && selectedModelo?.marcaId) {
      data.marcaId = selectedModelo.marcaId;
    }

    if (data.marcaId) {
      await this.validateMarca(data.marcaId, data.tipo);
    }

    const unidadMedida = await this.prisma.unidadMedida.findUnique({
      where: { id: data.unidadMedidaId },
    });
    if (!unidadMedida || unidadMedida.deletedAt || !unidadMedida.activo) {
      throw new NotFoundException(
        `Unidad de medida ${data.unidadMedidaId} no encontrada`,
      );
    }

    // Validar precio mínimo <= precio venta
    if (data.precioMinimo! > data.precioVenta!) {
      throw new BadRequestException(
        'El precio mínimo no puede ser mayor al precio de venta',
      );
    }

    const normalizedImagenes = this.normalizeImagenes({
      ...data,
      imagenes,
    } as CreateProductoDto);
    const normalizedModelo =
      (selectedModelo?.nombre ?? data.modelo?.trim()) || null;

    const producto = await this.prisma.producto.create({
      data: {
        sku: data.sku,
        nombre: data.nombre!,
        descripcion: data.descripcion?.trim() || null,
        tipo: data.tipo,
        categoriaId: data.categoriaId!,
        marcaId: data.marcaId ?? null,
        modeloCatalogoId: selectedModelo?.id ?? null,
        unidadMedidaId: data.unidadMedidaId!,
        modelo: normalizedModelo,
        codigoBarras: data.codigoBarras?.trim() || null,
        codigoQr: this.normalizeCodigoQrProducto(
          data.tipo,
          data.codigoQr,
          data.sku,
        ),
        condicion: data.condicion ?? null,
        precioCompra: data.precioCompra!,
        precioVenta: data.precioVenta!,
        precioMinimo: data.precioMinimo!,
        stockMinimo: data.stockMinimo ?? 0,
        manejaInventario: data.manejaInventario ?? true,
        tieneNumeroSerie: data.tieneNumeroSerie ?? false,
        esConsumible: data.esConsumible ?? false,
        requiereRepuestos: data.requiereRepuestos ?? false,
        tiempoEstimadoMin: data.tiempoEstimadoMin ?? null,
        mesesGarantia: data.mesesGarantia ?? 12,
        garantiaMaxCopias: data.garantiaMaxCopias ?? null,
        activo: data.activo ?? true,
        atributos: data.atributos ?? Prisma.JsonNull,
        imagen:
          this.getImagenPrincipal({ ...data, imagenes } as CreateProductoDto) ??
          null,
        imagenes: normalizedImagenes.length
          ? { create: normalizedImagenes }
          : undefined,
      },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
            tipo: true,
            padreId: true,
            padre: { select: { id: true, nombre: true } },
          },
        },
        marca: { select: { id: true, nombre: true } },
        modeloCatalogo: {
          select: {
            id: true,
            nombre: true,
            tipo: true,
            marca: { select: { id: true, nombre: true } },
          },
        },
        unidadMedida: { select: { id: true, codigo: true, nombre: true } },
        imagenes: { orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }] },
        almacenStocks: { select: { cantidad: true } },
      },
    });
    this.logger.log(`Producto creado: ${producto.id} (${producto.sku})`);

    if (
      dto.stockInicial?.length &&
      producto.manejaInventario &&
      userId &&
      userRol
    ) {
      await this.applyStockInicial(
        producto.id,
        producto.sku,
        Number(producto.precioCompra),
        dto.stockInicial,
        userId,
        userRol,
      );
    }

    return this.serializeProducto(producto, userRol);
  }

  private async applyStockInicial(
    productoId: string,
    sku: string,
    _precioCompra: number,
    items: StockInicialItemDto[],
    userId: string,
    userRol: RolUsuario,
  ) {
    for (const item of items) {
      try {
        await this.inventarioService.createMovimiento(
          {
            tipo: TipoMovimiento.AJUSTE_POSITIVO,
            productoId,
            almacenDestinoId: item.almacenId,
            cantidad: item.cantidad,
            justificacion: `Stock inicial al crear producto ${sku}`,
          },
          userId,
          userRol,
        );
      } catch (err) {
        this.logger.error(
          `No se pudo registrar stock inicial para ${productoId} en almacén ${item.almacenId}: ${(err as Error).message}`,
        );
        throw err;
      }
    }
  }

  async findAll(query: QueryProductoDto, userRol?: RolUsuario) {
    const {
      page = 1,
      limit = 20,
      search,
      tipo,
      excluirTipos,
      categoriaId,
      marcaId,
      condicion,
      esConsumible,
      tieneNumeroSerie,
      activo,
      conStock,
    } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (tipo) {
      where.tipo = tipo;
    } else if (excluirTipos && excluirTipos.length > 0) {
      where.tipo = { notIn: excluirTipos };
    }
    if (categoriaId) where.categoriaId = categoriaId;
    if (marcaId) where.marcaId = marcaId;
    if (condicion) where.condicion = condicion;
    if (esConsumible !== undefined) where.esConsumible = esConsumible;
    if (tieneNumeroSerie !== undefined)
      where.tieneNumeroSerie = tieneNumeroSerie;
    if (activo !== undefined) where.activo = activo;

    if (conStock) {
      where.AND = [
        ...((where.AND as unknown[]) ?? []),
        {
          OR: [
            { tipo: TipoProducto.SERVICIO },
            { almacenStocks: { some: { cantidad: { gt: 0 } } } },
          ],
        },
      ];
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { modelo: { contains: search, mode: 'insensitive' } },
        { codigoBarras: { contains: search, mode: 'insensitive' } },
        { codigoQr: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        skip,
        take: limit,
        include: {
          categoria: {
            select: {
              id: true,
              nombre: true,
              tipo: true,
              padreId: true,
              padre: { select: { id: true, nombre: true } },
            },
          },
          marca: { select: { id: true, nombre: true } },
          modeloCatalogo: {
            select: {
              id: true,
              nombre: true,
              tipo: true,
              marca: { select: { id: true, nombre: true } },
            },
          },
          unidadMedida: { select: { id: true, codigo: true, nombre: true } },
          imagenes: { orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }] },
          almacenStocks: { select: { cantidad: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.producto.count({ where }),
    ]);

    return {
      data: productos.map((producto) =>
        this.serializeProducto(producto, userRol),
      ),
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async findOne(id: string, userRol?: RolUsuario) {
    const producto = await this.prisma.producto.findFirst({
      where: { id, deletedAt: null },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
            tipo: true,
            padreId: true,
            padre: { select: { id: true, nombre: true } },
          },
        },
        marca: { select: { id: true, nombre: true } },
        modeloCatalogo: {
          select: {
            id: true,
            nombre: true,
            tipo: true,
            marca: { select: { id: true, nombre: true } },
          },
        },
        unidadMedida: { select: { id: true, codigo: true, nombre: true } },
        imagenes: { orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }] },
        almacenStocks: { select: { cantidad: true } },
        productoProveedores: {
          include: {
            proveedor: { select: { id: true, razonSocial: true, ruc: true } },
          },
        },
        compatibilidadesComoRepuesto: {
          include: {
            modelo: {
              select: { id: true, nombre: true, sku: true, modelo: true },
            },
          },
        },
      },
    });
    if (!producto) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }
    return this.serializeProducto(producto, userRol);
  }

  async update(id: string, dto: UpdateProductoDto, userRol?: RolUsuario) {
    const currentProduct = await this.findOne(id);
    const { data, imagenes } = this.normalizeProductoPayload(
      dto,
      currentProduct.tipo,
    );
    const effectiveTipo = data.tipo;
    let effectiveMarcaId =
      data.marcaId === undefined
        ? (currentProduct.marca?.id ?? null)
        : (data.marcaId ?? null);
    const effectiveModeloId =
      data.modeloId === undefined
        ? (currentProduct.modeloCatalogoId ?? null)
        : (data.modeloId ?? null);

    this.validateProductoFlags({
      tipo: effectiveTipo,
      tieneNumeroSerie:
        data.tieneNumeroSerie ?? currentProduct.tieneNumeroSerie,
      esConsumible: data.esConsumible ?? currentProduct.esConsumible,
    });

    if (data.sku) {
      const existing = await this.prisma.producto.findFirst({
        where: { sku: data.sku, deletedAt: null, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un producto con este SKU');
      }
    }

    if (data.categoriaId) {
      await this.validateCategoria(data.categoriaId, effectiveTipo);
    }

    const selectedModelo = effectiveModeloId
      ? await this.validateModeloCatalogo(
          effectiveModeloId,
          effectiveTipo,
          effectiveMarcaId,
        )
      : null;

    if (!effectiveMarcaId && selectedModelo?.marcaId) {
      effectiveMarcaId = selectedModelo.marcaId;
    }

    if (effectiveMarcaId) {
      await this.validateMarca(effectiveMarcaId, effectiveTipo);
    }

    if (data.unidadMedidaId) {
      const unidadMedida = await this.prisma.unidadMedida.findUnique({
        where: { id: data.unidadMedidaId },
      });
      if (!unidadMedida || unidadMedida.deletedAt || !unidadMedida.activo) {
        throw new NotFoundException(
          `Unidad de medida ${data.unidadMedidaId} no encontrada`,
        );
      }
    }

    const effectivePrecioVenta =
      data.precioVenta ?? Number(currentProduct.precioVenta);
    const effectivePrecioMinimo =
      data.precioMinimo ?? Number(currentProduct.precioMinimo);

    if (effectivePrecioMinimo > effectivePrecioVenta) {
      throw new BadRequestException(
        'El precio mínimo no puede ser mayor al precio de venta',
      );
    }

    const normalizedImagenes =
      imagenes !== undefined || data.imagen !== undefined
        ? this.normalizeImagenes({ ...data, imagenes } as UpdateProductoDto)
        : undefined;
    const normalizedModelo =
      selectedModelo?.nombre ??
      (data.modelo !== undefined ? data.modelo.trim() || null : undefined);

    const producto = await this.prisma.producto.update({
      where: { id },
      data: {
        ...(data.sku !== undefined ? { sku: data.sku.trim() } : {}),
        ...(data.nombre !== undefined ? { nombre: data.nombre.trim() } : {}),
        ...(data.descripcion !== undefined
          ? { descripcion: data.descripcion?.trim() || null }
          : {}),
        ...(data.tipo !== undefined ? { tipo: effectiveTipo } : {}),
        ...(data.categoriaId !== undefined
          ? { categoriaId: data.categoriaId }
          : {}),
        ...(data.marcaId !== undefined || selectedModelo?.marcaId
          ? { marcaId: effectiveMarcaId }
          : {}),
        ...(data.modeloId !== undefined || data.modelo !== undefined
          ? {
              modeloCatalogoId: selectedModelo?.id ?? null,
              modelo: normalizedModelo ?? null,
            }
          : {}),
        ...(data.unidadMedidaId !== undefined
          ? { unidadMedidaId: data.unidadMedidaId }
          : {}),
        ...(data.codigoBarras !== undefined
          ? { codigoBarras: data.codigoBarras?.trim() || null }
          : {}),
        codigoQr:
          effectiveTipo === TipoProducto.EQUIPO
            ? null
            : data.codigoQr === undefined
              ? undefined
              : data.codigoQr?.trim() ||
                currentProduct.codigoQr ||
                `PRD:${data.sku ?? currentProduct.sku}`,
        ...(data.condicion !== undefined
          ? { condicion: data.condicion ?? null }
          : {}),
        ...(data.precioCompra !== undefined
          ? { precioCompra: data.precioCompra }
          : {}),
        ...(data.precioVenta !== undefined
          ? { precioVenta: data.precioVenta }
          : {}),
        ...(data.precioMinimo !== undefined
          ? { precioMinimo: data.precioMinimo }
          : {}),
        ...(data.stockMinimo !== undefined
          ? { stockMinimo: data.stockMinimo }
          : {}),
        ...(data.manejaInventario !== undefined
          ? { manejaInventario: data.manejaInventario }
          : {}),
        ...(data.tieneNumeroSerie !== undefined
          ? { tieneNumeroSerie: data.tieneNumeroSerie }
          : {}),
        ...(data.esConsumible !== undefined
          ? { esConsumible: data.esConsumible }
          : {}),
        ...(data.requiereRepuestos !== undefined
          ? { requiereRepuestos: data.requiereRepuestos }
          : {}),
        ...(data.tiempoEstimadoMin !== undefined
          ? { tiempoEstimadoMin: data.tiempoEstimadoMin ?? null }
          : {}),
        ...(data.mesesGarantia !== undefined
          ? { mesesGarantia: data.mesesGarantia ?? 12 }
          : {}),
        ...(data.garantiaMaxCopias !== undefined
          ? { garantiaMaxCopias: data.garantiaMaxCopias ?? null }
          : {}),
        ...(data.activo !== undefined ? { activo: data.activo } : {}),
        ...(data.atributos !== undefined
          ? { atributos: data.atributos ?? Prisma.JsonNull }
          : {}),
        imagen:
          normalizedImagenes === undefined
            ? data.imagen
            : (this.getImagenPrincipal({
                ...data,
                imagenes,
              } as UpdateProductoDto) ?? null),
        imagenes:
          normalizedImagenes === undefined
            ? undefined
            : {
                deleteMany: {},
                create: normalizedImagenes,
              },
      },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
            tipo: true,
            padreId: true,
            padre: { select: { id: true, nombre: true } },
          },
        },
        marca: { select: { id: true, nombre: true } },
        modeloCatalogo: {
          select: {
            id: true,
            nombre: true,
            tipo: true,
            marca: { select: { id: true, nombre: true } },
          },
        },
        unidadMedida: { select: { id: true, codigo: true, nombre: true } },
        imagenes: { orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }] },
        almacenStocks: { select: { cantidad: true } },
      },
    });
    this.logger.log(`Producto actualizado: ${id}`);
    return this.serializeProducto(producto, userRol);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.producto.update({
      where: { id },
      data: { deletedAt: new Date(), activo: false },
    });
    this.logger.log(`Producto eliminado (soft delete): ${id}`);
  }

  // ── ProductoProveedor ──
  async addProveedor(productoId: string, dto: CreateProductoProveedorDto) {
    await this.findOne(productoId);

    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id: dto.proveedorId, deletedAt: null },
    });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor ${dto.proveedorId} no encontrado`);
    }

    const existing = await this.prisma.productoProveedor.findUnique({
      where: {
        productoId_proveedorId: { productoId, proveedorId: dto.proveedorId },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Este proveedor ya está asociado al producto',
      );
    }

    // Si se marca como principal, desmarcar los demás
    if (dto.esPrincipal) {
      await this.prisma.productoProveedor.updateMany({
        where: { productoId },
        data: { esPrincipal: false },
      });
    }

    const data: ProductoProveedorUncheckedCreateInput = { productoId, ...dto };

    return this.prisma.productoProveedor.create({
      data,
    });
  }

  async removeProveedor(productoId: string, proveedorId: string) {
    const relation = await this.prisma.productoProveedor.findUnique({
      where: { productoId_proveedorId: { productoId, proveedorId } },
    });
    if (!relation) {
      throw new NotFoundException('Relación producto-proveedor no encontrada');
    }

    await this.prisma.productoProveedor.delete({
      where: { id: relation.id },
    });
  }

  async findProveedores(productoId: string) {
    await this.findOne(productoId);
    return this.prisma.productoProveedor.findMany({
      where: { productoId },
      include: {
        proveedor: { select: { id: true, razonSocial: true, ruc: true } },
      },
    });
  }

  // ── Compatibilidad ──
  async addCompatibilidad(repuestoId: string, dto: CreateCompatibilidadDto) {
    const repuesto = await this.findOne(repuestoId);
    if (repuesto.tieneNumeroSerie) {
      throw new BadRequestException(
        'Solo los repuestos/consumibles pueden tener compatibilidades, no los equipos con número de serie',
      );
    }

    const modelo = await this.prisma.producto.findFirst({
      where: { id: dto.modeloId, deletedAt: null },
    });
    if (!modelo) {
      throw new NotFoundException(`Modelo ${dto.modeloId} no encontrado`);
    }

    const existing = await this.prisma.compatibilidad.findUnique({
      where: { repuestoId_modeloId: { repuestoId, modeloId: dto.modeloId } },
    });
    if (existing) {
      throw new ConflictException('Esta compatibilidad ya está registrada');
    }

    return this.prisma.compatibilidad.create({
      data: { repuestoId, modeloId: dto.modeloId, notas: dto.notas },
    });
  }

  async removeCompatibilidad(repuestoId: string, modeloId: string) {
    const relation = await this.prisma.compatibilidad.findUnique({
      where: { repuestoId_modeloId: { repuestoId, modeloId } },
    });
    if (!relation) {
      throw new NotFoundException('Compatibilidad no encontrada');
    }

    await this.prisma.compatibilidad.delete({ where: { id: relation.id } });
  }

  async findCompatibilidades(repuestoId: string) {
    await this.findOne(repuestoId);
    return this.prisma.compatibilidad.findMany({
      where: { repuestoId },
      include: {
        modelo: { select: { id: true, nombre: true, sku: true, modelo: true } },
      },
    });
  }

  // ═══════════════════════════════════════════
  //  CATÁLOGO PÚBLICO
  // ═══════════════════════════════════════════

  async catalogoPublico(query: QueryProductoDto) {
    const { page = 1, limit = 20, search, categoriaId, marcaId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null, activo: true };

    if (categoriaId) where.categoriaId = categoriaId;
    if (marcaId) where.marcaId = marcaId;

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { modelo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          sku: true,
          nombre: true,
          descripcion: true,
          modelo: true,
          precioVenta: true,
          imagen: true,
          imagenes: { orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }] },
          tipo: true,
          tieneNumeroSerie: true,
          esConsumible: true,
          categoria: { select: { id: true, nombre: true, tipo: true } },
          marca: { select: { id: true, nombre: true } },
        },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.producto.count({ where }),
    ]);

    return {
      data: productos,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async catalogoDetalle(sku: string) {
    const producto = await this.prisma.producto.findFirst({
      where: { sku, deletedAt: null, activo: true },
      select: {
        id: true,
        sku: true,
        nombre: true,
        descripcion: true,
        modelo: true,
        precioVenta: true,
        imagen: true,
        imagenes: { orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }] },
        tipo: true,
        unidadMedida: { select: { id: true, codigo: true, nombre: true } },
        tieneNumeroSerie: true,
        esConsumible: true,
        categoria: { select: { id: true, nombre: true, tipo: true } },
        marca: { select: { id: true, nombre: true } },
        compatibilidadesComoModelo: {
          include: {
            repuesto: { select: { id: true, nombre: true, sku: true } },
          },
        },
        compatibilidadesComoRepuesto: {
          include: {
            modelo: {
              select: { id: true, nombre: true, sku: true, modelo: true },
            },
          },
        },
      },
    });
    if (!producto) {
      throw new NotFoundException(`Producto con SKU ${sku} no encontrado`);
    }
    return { data: producto, meta: { timestamp: new Date().toISOString() } };
  }
}
