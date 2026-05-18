import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolUsuario } from '@erp/shared';
import { ReportesService } from './reportes.service';
import {
  QueryReporteVentasDto,
  QueryReporteTicketsDto,
  QueryReporteStockDto,
  QueryReporteClientesDto,
  QueryTelemetriaDto,
} from './dto';

@ApiTags('Reportes')
@ApiBearerAuth()
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('dashboard')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'KPIs del dashboard principal' })
  getDashboard() {
    return this.reportesService.getDashboard();
  }

  @Get('ventas')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Reporte de ventas con filtros' })
  getReporteVentas(@Query() query: QueryReporteVentasDto) {
    return this.reportesService.getReporteVentas(query);
  }

  @Get('stock')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Reporte de stock y alertas' })
  getReporteStock(@Query() query: QueryReporteStockDto) {
    return this.reportesService.getReporteStock(query);
  }

  @Get('tickets')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Reporte de tickets de soporte' })
  getReporteTickets(@Query() query: QueryReporteTicketsDto) {
    return this.reportesService.getReporteTickets(query);
  }

  @Get('clientes')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Reporte de clientes top' })
  getReporteClientes(@Query() query: QueryReporteClientesDto) {
    return this.reportesService.getReporteClientes(query);
  }

  @Get('telemetria/:equipoSerie')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Telemetría SNMP de un equipo por serie' })
  getTelemetria(
    @Param('equipoSerie') equipoSerie: string,
    @Query() query: QueryTelemetriaDto,
  ) {
    return this.reportesService.getTelemetria(equipoSerie, query);
  }
}
