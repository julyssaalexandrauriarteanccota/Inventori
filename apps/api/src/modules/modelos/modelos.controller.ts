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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@erp/shared';
import { Roles } from '../../common/decorators';
import { CreateModeloDto, QueryModeloDto, UpdateModeloDto } from './dto';
import { ModelosService } from './modelos.service';

@ApiTags('Modelos')
@ApiBearerAuth()
@Controller('modelos')
export class ModelosController {
  constructor(private readonly modelosService: ModelosService) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Crear modelo de catálogo' })
  create(@Body() dto: CreateModeloDto) {
    return this.modelosService.create(dto);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar modelos de catálogo' })
  findAll(@Query() query: QueryModeloDto) {
    return this.modelosService.findAll(query);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Obtener modelo de catálogo por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.modelosService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Actualizar modelo de catálogo' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateModeloDto) {
    return this.modelosService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar modelo de catálogo' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.modelosService.remove(id);
  }
}
