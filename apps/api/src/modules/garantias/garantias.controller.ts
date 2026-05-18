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
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { GarantiasService } from './garantias.service';
import {
  CreateGarantiaDto,
  CreateCasoGarantiaDto,
  UpdateCasoGarantiaDto,
  QueryGarantiaDto,
} from './dto';

@ApiTags('Garantías')
@ApiBearerAuth()
@Controller('garantias')
export class GarantiasController {
  constructor(private readonly garantiasService: GarantiasService) {}

  // ── CRUD GARANTÍAS ─────────────────────────

  @Post()
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Crear garantía para un equipo' })
  create(@Body() dto: CreateGarantiaDto) {
    return this.garantiasService.create(dto);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar garantías con filtros y paginación' })
  findAll(@Query() query: QueryGarantiaDto) {
    return this.garantiasService.findAll(query);
  }

  @Get('verificar/:codigoQR')
  @Public()
  @ApiOperation({
    summary: 'Consulta pública de garantía por código QR (sin login)',
  })
  verificarPorCodigoQR(@Param('codigoQR') codigoQR: string) {
    return this.garantiasService.verificarPorCodigoQR(codigoQR);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Obtener garantía por ID con detalle de casos' })
  findOne(@Param('id') id: string) {
    return this.garantiasService.findOne(id);
  }

  // ── CASOS DE GARANTÍA ─────────────────────

  @Post(':id/casos')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Abrir un caso de garantía' })
  createCaso(@Param('id') id: string, @Body() dto: CreateCasoGarantiaDto) {
    return this.garantiasService.createCaso(id, dto);
  }

  @Patch(':id/casos/:casoId')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Actualizar caso de garantía (resolver/aceptar/rechazar)',
  })
  updateCaso(
    @Param('id') id: string,
    @Param('casoId') casoId: string,
    @Body() dto: UpdateCasoGarantiaDto,
  ) {
    return this.garantiasService.updateCaso(id, casoId, dto);
  }
}
