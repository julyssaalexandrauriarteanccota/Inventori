import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RolUsuario } from '@erp/shared';
import { ConfigService } from './config.service';
import { UpdateConfigEmpresaDto } from '../facturacion/dto/update-config-empresa.dto';
import {
  UpdateSeriesDto,
  CreateMetodoPagoDto,
  UpdateMetodoPagoDto,
  UpdateTipoMovimientoConfigDto,
  QueryAuditoriaDto,
} from './dto';

@ApiTags('Configuración')
@ApiBearerAuth()
@Controller('config')
export class AdminConfigController {
  constructor(private readonly configService: ConfigService) {}

  // ═══════════════════════════════════════════
  //  EMPRESA
  // ═══════════════════════════════════════════

  @Get('empresa/publica')
  @Public()
  @ApiOperation({
    summary: 'Obtener datos públicos de la empresa (sin autenticación)',
  })
  getEmpresaPublica() {
    return this.configService.getEmpresaPublica();
  }

  @Get('empresa')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Obtener configuración de empresa' })
  getEmpresa() {
    return this.configService.getEmpresa();
  }

  @Patch('empresa')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar configuración de empresa' })
  updateEmpresa(@Body() dto: UpdateConfigEmpresaDto) {
    return this.configService.updateEmpresa(dto);
  }

  // ═══════════════════════════════════════════
  //  SERIES DE DOCUMENTOS
  // ═══════════════════════════════════════════

  @Get('series')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Obtener series de documentos' })
  getSeries() {
    return this.configService.getSeries();
  }

  @Patch('series')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar series de documentos' })
  updateSeries(@Body() dto: UpdateSeriesDto) {
    return this.configService.updateSeries(dto);
  }

  // ═══════════════════════════════════════════
  //  MÉTODOS DE PAGO
  // ═══════════════════════════════════════════

  @Get('metodos-pago')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Listar todos los métodos de pago' })
  findAllMetodosPago() {
    return this.configService.findAllMetodosPago();
  }

  @Post('metodos-pago')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Crear método de pago' })
  createMetodoPago(@Body() dto: CreateMetodoPagoDto) {
    return this.configService.createMetodoPago(dto);
  }

  @Patch('metodos-pago/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar método de pago' })
  updateMetodoPago(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMetodoPagoDto,
  ) {
    return this.configService.updateMetodoPago(id, dto);
  }

  @Delete('metodos-pago/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Eliminar método de pago' })
  deleteMetodoPago(@Param('id', ParseUUIDPipe) id: string) {
    return this.configService.deleteMetodoPago(id);
  }

  @Get('tipos-movimiento')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar tipos de movimiento configurables' })
  findAllTiposMovimiento() {
    return this.configService.findAllTiposMovimiento();
  }

  @Patch('tipos-movimiento/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({
    summary: 'Actualizar configuración de un tipo de movimiento',
  })
  updateTipoMovimiento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTipoMovimientoConfigDto,
  ) {
    return this.configService.updateTipoMovimiento(id, dto);
  }

  // ═══════════════════════════════════════════
  //  AUDITORÍA
  // ═══════════════════════════════════════════

  @Get('auditoria')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({
    summary: 'Listar registros de auditoría (paginado con filtros)',
  })
  findAllAuditoria(@Query() query: QueryAuditoriaDto) {
    return this.configService.findAllAuditoria(query);
  }

  @Get('auditoria/:id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Ver detalle de un registro de auditoría' })
  findOneAuditoria(@Param('id', ParseUUIDPipe) id: string) {
    return this.configService.findOneAuditoria(id);
  }
}
