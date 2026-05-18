import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@erp/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { UnidadesMedidaService } from './unidades-medida.service';
import { CreateUnidadMedidaDto, UpdateUnidadMedidaDto } from './dto';

@ApiTags('Unidades de medida')
@ApiBearerAuth()
@Controller('unidades-medida')
export class UnidadesMedidaController {
  constructor(private readonly unidadesMedidaService: UnidadesMedidaService) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Crear unidad de medida' })
  create(@Body() dto: CreateUnidadMedidaDto) {
    return this.unidadesMedidaService.create(dto);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar unidades de medida' })
  findAll() {
    return this.unidadesMedidaService.findAll();
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Obtener unidad de medida por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.unidadesMedidaService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Actualizar unidad de medida' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnidadMedidaDto,
  ) {
    return this.unidadesMedidaService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar unidad de medida' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.unidadesMedidaService.remove(id);
  }
}
