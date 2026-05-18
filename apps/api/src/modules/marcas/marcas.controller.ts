import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolUsuario, TipoProducto } from '@erp/shared';
import { MarcasService } from './marcas.service';
import { CreateMarcaDto, UpdateMarcaDto } from './dto';
import { Roles, Public } from '../../common/decorators';

@ApiTags('Marcas')
@ApiBearerAuth()
@Controller('marcas')
export class MarcasController {
  constructor(private readonly marcasService: MarcasService) {}

  @Get('publico')
  @Public()
  @ApiOperation({ summary: 'Listar marcas públicas (sin autenticación)' })
  findAllPublic(@Query('tipo') tipo?: TipoProducto) {
    return this.marcasService.findAll(tipo);
  }

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Crear marca' })
  create(@Body() dto: CreateMarcaDto) {
    return this.marcasService.create(dto);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar marcas' })
  findAll(@Query('tipo') tipo?: TipoProducto) {
    return this.marcasService.findAll(tipo);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Obtener marca por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.marcasService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Actualizar marca' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMarcaDto) {
    return this.marcasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar marca (solo si no tiene productos)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.marcasService.remove(id);
  }
}
