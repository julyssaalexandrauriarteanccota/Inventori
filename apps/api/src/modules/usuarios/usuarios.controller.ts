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
import { RolUsuario } from '@erp/shared';
import { UsuariosService } from './usuarios.service';
import {
  ActivarUsuarioDto,
  CreateUsuarioDto,
  UpdateUsuarioDto,
  QueryUsuarioDto,
  ChangePasswordDto,
} from './dto';
import { Roles } from '../../common/decorators';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Get()
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Listar usuarios (paginado)' })
  findAll(@Query() query: QueryUsuarioDto) {
    return this.usuariosService.findAll(query);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(id, dto);
  }

  @Patch(':id/password')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cambiar contraseña de usuario (admin)' })
  changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangePasswordDto,
  ) {
    // Admin elige la pwd → forzar rotación en el próximo login.
    return this.usuariosService.changePassword(id, dto, { forceChange: true });
  }

  @Patch(':id/activar')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({
    summary:
      'Activar cuenta y asignar rol (requiere email verificado, envía bienvenida)',
  })
  activar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivarUsuarioDto,
  ) {
    return this.usuariosService.activar(id, dto);
  }

  @Patch(':id/desactivar')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({ summary: 'Desactivar cuenta y revocar sesiones' })
  desactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.desactivar(id);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar usuario (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.remove(id);
  }
}
