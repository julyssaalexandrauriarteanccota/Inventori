import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@erp/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { AlquileresService } from './alquileres.service';
import {
  ActivarContratoAlquilerDto,
  CancelarContratoAlquilerDto,
  CerrarPeriodoAlquilerDto,
  CobrarPeriodoAlquilerDto,
  CreateContratoAlquilerDto,
  FinalizarContratoAlquilerDto,
  QueryAlquilerDto,
  RegistrarLecturaAlquilerDto,
  UpdateContratoAlquilerDto,
} from './dto';

@ApiTags('Alquileres')
@ApiBearerAuth()
@Controller('alquileres')
export class AlquileresController {
  constructor(private readonly alquileresService: AlquileresService) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Crear contrato de alquiler en borrador' })
  create(
    @Body() dto: CreateContratoAlquilerDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.alquileresService.create(dto, userId);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Listar contratos de alquiler' })
  findAll(@Query() query: QueryAlquilerDto) {
    return this.alquileresService.findAll(query);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Detalle del contrato de alquiler' })
  findOne(@Param('id') id: string) {
    return this.alquileresService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Editar contrato de alquiler en borrador' })
  update(@Param('id') id: string, @Body() dto: UpdateContratoAlquilerDto) {
    return this.alquileresService.update(id, dto);
  }

  @Post(':id/activar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Activar contrato y crear periodos pendientes de cobro',
  })
  activar(
    @Param('id') id: string,
    @Body() dto: ActivarContratoAlquilerDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.alquileresService.activar(id, dto, userId);
  }

  @Post(':id/lecturas')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Registrar lectura manual de contador' })
  registrarLectura(
    @Param('id') id: string,
    @Body() dto: RegistrarLecturaAlquilerDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.alquileresService.registrarLectura(id, dto, userId);
  }

  @Post(':id/periodos/:periodoId/cerrar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Cerrar lectura mensual y calcular excedentes' })
  cerrarPeriodo(
    @Param('id') id: string,
    @Param('periodoId') periodoId: string,
    @Body() dto: CerrarPeriodoAlquilerDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.alquileresService.cerrarPeriodo(id, periodoId, dto, userId);
  }

  @Post(':id/periodos/:periodoId/cobrar-cierre')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Cobrar excedente de copias del periodo' })
  cobrarCierre(
    @Param('id') id: string,
    @Param('periodoId') periodoId: string,
    @Body() dto: CobrarPeriodoAlquilerDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.alquileresService.cobrarCierre(id, periodoId, dto, userId);
  }

  @Post(':id/periodos/:periodoId/cobrar-base')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Cobrar mensualidad base de un periodo pendiente' })
  cobrarBase(
    @Param('id') id: string,
    @Param('periodoId') periodoId: string,
    @Body() dto: CobrarPeriodoAlquilerDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.alquileresService.cobrarBase(id, periodoId, dto, userId);
  }

  @Post(':id/finalizar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Finalizar contrato y devolver equipo al almacén' })
  finalizar(
    @Param('id') id: string,
    @Body() dto: FinalizarContratoAlquilerDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.alquileresService.finalizar(id, dto, userId);
  }

  @Post(':id/cancelar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Cancelar contrato de alquiler' })
  cancelar(
    @Param('id') id: string,
    @Body() dto: CancelarContratoAlquilerDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.alquileresService.cancelar(id, dto, userId);
  }

  @Post(':id/anular')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Anular contrato activo y devolver equipo al almacén',
  })
  anular(
    @Param('id') id: string,
    @Body() dto: CancelarContratoAlquilerDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.alquileresService.cancelar(id, dto, userId);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Eliminar registro de alquiler no activo' })
  remove(@Param('id') id: string) {
    return this.alquileresService.removeRecord(id);
  }
}
