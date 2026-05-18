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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RolUsuario } from '@erp/shared';
import { InventarioService } from './inventario.service';
import {
  CreateAlmacenDto,
  UpdateAlmacenDto,
  CreateMovimientoDto,
  QueryMovimientoDto,
  QueryStockDto,
} from './dto';
import { Roles, CurrentUser } from '../../common/decorators';

@ApiTags('Inventario')
@ApiBearerAuth()
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  // ── Almacenes ──

  @Post('almacenes')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Crear almacén' })
  createAlmacen(@Body() dto: CreateAlmacenDto) {
    return this.inventarioService.createAlmacen(dto);
  }

  @Get('almacenes')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar almacenes' })
  findAllAlmacenes() {
    return this.inventarioService.findAllAlmacenes();
  }

  @Get('almacenes/:id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Obtener almacén por ID' })
  findOneAlmacen(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventarioService.findOneAlmacen(id);
  }

  @Patch('almacenes/:id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Actualizar almacén' })
  updateAlmacen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlmacenDto,
  ) {
    return this.inventarioService.updateAlmacen(id, dto);
  }

  @Delete('almacenes/:id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar almacén (solo si no tiene stock)' })
  removeAlmacen(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventarioService.removeAlmacen(id);
  }

  // ── Stock ──

  @Get('stock')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Consultar stock (paginado con filtros)' })
  findStock(@Query() query: QueryStockDto) {
    return this.inventarioService.findStock(query);
  }

  @Get('stock/:productoId')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Stock de un producto en todos los almacenes' })
  findStockByProducto(@Param('productoId', ParseUUIDPipe) productoId: string) {
    return this.inventarioService.findStockByProducto(productoId);
  }

  // ── Movimientos ──

  @Post('movimientos')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Registrar movimiento de stock' })
  createMovimiento(
    @Body() dto: CreateMovimientoDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.inventarioService.createMovimiento(dto, userId, userRol);
  }

  @Get('movimientos')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Historial de movimientos (paginado)' })
  findMovimientos(@Query() query: QueryMovimientoDto) {
    return this.inventarioService.findMovimientos(query);
  }

  // ── Alertas ──

  @Get('alertas')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Listar alertas de stock mínimo' })
  @ApiQuery({ name: 'resuelta', required: false, type: Boolean })
  findAlertas(@Query('resuelta') resuelta?: string) {
    const parsed =
      resuelta === 'true' ? true : resuelta === 'false' ? false : undefined;
    return this.inventarioService.findAlertas(parsed);
  }

  @Patch('alertas/:id/resolver')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Marcar alerta como resuelta' })
  resolveAlerta(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.inventarioService.resolveAlerta(id, userId);
  }
}
