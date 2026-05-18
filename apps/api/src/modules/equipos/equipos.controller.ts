import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolUsuario } from '@erp/shared';
import { CurrentUser, Roles } from '../../common/decorators';
import { EquiposService } from './equipos.service';
import {
  CreateEquipoDto,
  UpdateEquipoDto,
  QueryEquipoDto,
  AsignarClienteDto,
  CreateLecturaSNMPDto,
  QueryLecturaSNMPDto,
} from './dto';

@ApiTags('Equipos')
@ApiBearerAuth()
@Controller('equipos')
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  // ── CRUD EQUIPOS ────────────────────────────

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Registrar equipo serializado' })
  create(@Body() dto: CreateEquipoDto, @CurrentUser('sub') userId: string) {
    return this.equiposService.create(dto, userId);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar equipos paginados con filtros' })
  findAll(@Query() query: QueryEquipoDto) {
    return this.equiposService.findAll(query);
  }

  @Get(':serie')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Obtener equipo por número de serie' })
  findBySerie(@Param('serie') serie: string) {
    return this.equiposService.findBySerie(serie);
  }

  @Patch(':serie')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Actualizar equipo' })
  update(
    @Param('serie') serie: string,
    @Body() dto: UpdateEquipoDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.equiposService.update(serie, dto, userId);
  }

  // ── ASIGNACIÓN EQUIPO ↔ CLIENTE ────────────

  @Post(':serie/asignar-cliente')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Asignar equipo a un cliente (cierra asignación anterior)',
  })
  asignarCliente(
    @Param('serie') serie: string,
    @Body() dto: AsignarClienteDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.equiposService.asignarCliente(serie, dto, userId);
  }

  @Get(':serie/historial')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Historial de clientes del equipo' })
  findHistorial(@Param('serie') serie: string) {
    return this.equiposService.findHistorial(serie);
  }

  // ── LECTURAS SNMP ──────────────────────────

  @Post(':serie/lecturas-snmp')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Registrar lectura SNMP del equipo' })
  createLecturaSNMP(
    @Param('serie') serie: string,
    @Body() dto: CreateLecturaSNMPDto,
  ) {
    return this.equiposService.createLecturaSNMP(serie, dto);
  }

  @Post(':serie/lecturas-snmp/sync')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({
    summary: 'Capturar lectura SNMP automáticamente desde el equipo',
  })
  syncLecturaSNMP(@Param('serie') serie: string) {
    return this.equiposService.syncLecturaSNMP(serie);
  }

  @Get(':serie/lecturas-snmp')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar lecturas SNMP con filtros de fecha' })
  findLecturasSNMP(
    @Param('serie') serie: string,
    @Query() query: QueryLecturaSNMPDto,
  ) {
    return this.equiposService.findLecturasSNMP(serie, query);
  }
}
