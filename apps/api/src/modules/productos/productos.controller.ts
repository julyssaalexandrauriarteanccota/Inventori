import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolUsuario, TipoProducto } from '@erp/shared';
import { ProductosService } from './productos.service';
import {
  CreateProductoDto,
  UpdateProductoDto,
  QueryProductoDto,
  CreateProductoProveedorDto,
  CreateCompatibilidadDto,
} from './dto';
import { Roles, Public, CurrentUser } from '../../common/decorators';

@ApiTags('Productos')
@ApiBearerAuth()
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  // ── Catálogo público (sin auth) — ANTES de las rutas con :id ──
  @Get('catalogo')
  @Public()
  @ApiOperation({
    summary: 'Catálogo público de productos (sin autenticación)',
  })
  catalogoPublico(@Query() query: QueryProductoDto) {
    return this.productosService.catalogoPublico(query);
  }

  @Get('catalogo/:sku')
  @Public()
  @ApiOperation({
    summary: 'Detalle público de producto por SKU (sin autenticación)',
  })
  catalogoDetalle(@Param('sku') sku: string) {
    return this.productosService.catalogoDetalle(sku);
  }

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Crear producto' })
  create(
    @Body() dto: CreateProductoDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.productosService.create(dto, userId, userRol);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar productos (paginado con filtros)' })
  findAll(
    @Query() query: QueryProductoDto,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.productosService.findAll(query, userRol);
  }

  @Get('sku-sugerido')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Generar un SKU sugerido por tipo y categoría' })
  suggestSku(
    @Query('tipo') tipo?: TipoProducto,
    @Query('categoriaId') categoriaId?: string,
    @CurrentUser('rol') userRol?: RolUsuario,
  ) {
    return this.productosService.suggestSku(tipo, categoriaId, userRol);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Obtener producto por ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.productosService.findOne(id, userRol);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Actualizar producto' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductoDto,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.productosService.update(id, dto, userRol);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar producto (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productosService.remove(id);
  }

  // ── Proveedores del producto ──
  @Post(':id/proveedores')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Asociar proveedor al producto' })
  addProveedor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProductoProveedorDto,
  ) {
    return this.productosService.addProveedor(id, dto);
  }

  @Get(':id/proveedores')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Listar proveedores del producto' })
  findProveedores(@Param('id', ParseUUIDPipe) id: string) {
    return this.productosService.findProveedores(id);
  }

  @Delete(':id/proveedores/:proveedorId')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desasociar proveedor del producto' })
  removeProveedor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('proveedorId', ParseUUIDPipe) proveedorId: string,
  ) {
    return this.productosService.removeProveedor(id, proveedorId);
  }

  // ── Compatibilidades (repuesto ↔ modelo) ──
  @Post(':id/compatibilidades')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Registrar compatibilidad repuesto → modelo' })
  addCompatibilidad(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCompatibilidadDto,
  ) {
    return this.productosService.addCompatibilidad(id, dto);
  }

  @Get(':id/compatibilidades')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar modelos compatibles con este repuesto' })
  findCompatibilidades(@Param('id', ParseUUIDPipe) id: string) {
    return this.productosService.findCompatibilidades(id);
  }

  @Delete(':id/compatibilidades/:modeloId')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar compatibilidad' })
  removeCompatibilidad(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('modeloId', ParseUUIDPipe) modeloId: string,
  ) {
    return this.productosService.removeCompatibilidad(id, modeloId);
  }
}
