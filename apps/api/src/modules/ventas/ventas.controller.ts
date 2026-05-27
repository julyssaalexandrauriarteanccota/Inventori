import {
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolUsuario } from '@erp/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { VentasService } from './ventas.service';
import {
  CobrarEmitirPosDto,
  CreateVentaDto,
  UpdateVentaDto,
  QueryVentaDto,
  ConfirmarVentaDto,
} from './dto';

@ApiTags('Ventas')
@ApiBearerAuth()
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Crear cotización' })
  create(@Body() dto: CreateVentaDto, @CurrentUser('sub') userId: string) {
    return this.ventasService.create(dto, userId);
  }

  @Post('pos/cobrar-emitir')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary:
      'Cobrar venta POS y crear boleta pendiente en una sola transacción',
  })
  cobrarEmitirPos(
    @Body() dto: CobrarEmitirPosDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.ventasService.cobrarEmitirPos(dto, userId);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Listar ventas con filtros' })
  findAll(@Query() query: QueryVentaDto) {
    return this.ventasService.findAll(query);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Obtener venta con detalles y garantías' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ventasService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Actualizar cotización (solo estado COTIZACION)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVentaDto) {
    return this.ventasService.update(id, dto);
  }

  @Patch(':id/confirmar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary:
      'Confirmar venta — descuenta stock, asigna equipos, crea garantías',
  })
  confirmar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmarVentaDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.ventasService.confirmar(id, dto, userId);
  }

  @Patch(':id/reservar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Reservar equipos de una cotización aceptada',
  })
  reservar(@Param('id', ParseUUIDPipe) id: string) {
    return this.ventasService.reservar(id);
  }

  @Patch(':id/entregar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Marcar venta como entregada' })
  entregar(@Param('id', ParseUUIDPipe) id: string) {
    return this.ventasService.entregar(id);
  }

  @Patch(':id/cancelar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Anular venta con reverso (stock, equipos, garantías y caja)',
  })
  cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { motivo?: string } = {},
    @CurrentUser('sub') userId: string,
  ) {
    return this.ventasService.cancelar(id, userId, body?.motivo);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Eliminar una venta ya cancelada (borrado lógico)',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ventasService.remove(id);
  }

  @Post(':id/enviar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Preparar envío de cotización (trigger para Sprint 17)',
  })
  enviarCotizacion(@Param('id', ParseUUIDPipe) id: string) {
    return this.ventasService.prepararEnvioCotizacion(id);
  }
}
