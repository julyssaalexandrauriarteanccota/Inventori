import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@erp/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { CajaService } from './caja.service';
import {
  AbrirCajaDto,
  CerrarCajaDto,
  CreateArqueoCajaDto,
  CreateCajaDto,
  CreateMovimientoCajaDto,
  UpdateCajaDto,
} from './dto';

@ApiTags('Caja')
@ApiBearerAuth()
@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  // ── Cajas ──

  @Post('cajas')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Crear caja' })
  createCaja(@Body() dto: CreateCajaDto) {
    return this.cajaService.createCaja(dto);
  }

  @Get('cajas')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar cajas' })
  findAllCajas() {
    return this.cajaService.findAllCajas();
  }

  @Get('cajas/:id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Obtener caja' })
  findOneCaja(@Param('id', ParseUUIDPipe) id: string) {
    return this.cajaService.findOneCaja(id);
  }

  @Patch('cajas/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar caja' })
  updateCaja(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCajaDto,
  ) {
    return this.cajaService.updateCaja(id, dto);
  }

  // ── Aperturas ──

  @Get('aperturas/activa')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Apertura activa de una caja' })
  getAperturaActiva(@Query('cajaId', ParseUUIDPipe) cajaId: string) {
    return this.cajaService.getAperturaActiva(cajaId);
  }

  @Get('aperturas/mia')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Mi apertura activa' })
  getMiApertura(@CurrentUser('sub') usuarioId: string) {
    return this.cajaService.getMiAperturaActiva(usuarioId);
  }

  @Post('aperturas')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Abrir caja' })
  abrir(@CurrentUser('sub') usuarioId: string, @Body() dto: AbrirCajaDto) {
    return this.cajaService.abrir(usuarioId, dto);
  }

  @Patch('aperturas/:id/cerrar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Cerrar caja' })
  cerrar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') usuarioId: string,
    @Body() dto: CerrarCajaDto,
  ) {
    return this.cajaService.cerrar(id, usuarioId, dto);
  }

  @Get('aperturas/:id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Resumen de apertura' })
  getResumen(@Param('id', ParseUUIDPipe) id: string) {
    return this.cajaService.getResumenApertura(id);
  }

  // ── Movimientos ──

  @Post('aperturas/:id/movimientos')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Registrar movimiento de caja' })
  registrarMovimiento(
    @Param('id', ParseUUIDPipe) aperturaId: string,
    @CurrentUser('sub') usuarioId: string,
    @Body() dto: CreateMovimientoCajaDto,
  ) {
    return this.cajaService.registrarMovimiento(aperturaId, usuarioId, dto);
  }

  @Get('aperturas/:id/movimientos')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar movimientos de la apertura' })
  listarMovimientos(@Param('id', ParseUUIDPipe) aperturaId: string) {
    return this.cajaService.listarMovimientos(aperturaId);
  }

  // ── Arqueos ──

  @Post('aperturas/:id/arqueos')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Registrar arqueo intermedio' })
  registrarArqueo(
    @Param('id', ParseUUIDPipe) aperturaId: string,
    @CurrentUser('sub') usuarioId: string,
    @Body() dto: CreateArqueoCajaDto,
  ) {
    return this.cajaService.registrarArqueo(aperturaId, usuarioId, dto);
  }
}
