import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@erp/shared';
import { Roles } from '../../common/decorators';
import { BuscarUbicacionDto, ReverseGeocodeDto } from './dto';
import { UbicacionesService } from './ubicaciones.service';

@ApiTags('Ubicaciones')
@ApiBearerAuth()
@Controller('ubicaciones')
export class UbicacionesController {
  constructor(private readonly ubicacionesService: UbicacionesService) {}

  @Get('buscar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Buscar direcciones y ubicaciones en mapa' })
  buscar(@Query() dto: BuscarUbicacionDto) {
    return this.ubicacionesService.buscar(dto);
  }

  @Get('reversa')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Resolver dirección a partir de coordenadas' })
  reversa(@Query() dto: ReverseGeocodeDto) {
    return this.ubicacionesService.reversa(dto);
  }
}
