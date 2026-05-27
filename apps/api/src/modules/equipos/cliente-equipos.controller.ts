import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@erp/shared';
import { Roles } from '../../common/decorators';
import { ClienteEquiposService } from './cliente-equipos.service';
import {
  CreateClienteEquipoDto,
  QueryClienteEquipoDto,
  UpdateClienteEquipoDto,
} from './dto';

@ApiTags('Equipos de cliente')
@ApiBearerAuth()
@Controller('equipos-cliente')
export class ClienteEquiposController {
  constructor(private readonly clienteEquiposService: ClienteEquiposService) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Registrar equipo externo propiedad del cliente' })
  create(@Body() dto: CreateClienteEquipoDto) {
    return this.clienteEquiposService.create(dto);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar equipos externos de clientes' })
  findAll(@Query() query: QueryClienteEquipoDto) {
    return this.clienteEquiposService.findAll(query);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Obtener equipo externo de cliente' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clienteEquiposService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Actualizar equipo externo de cliente' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClienteEquipoDto,
  ) {
    return this.clienteEquiposService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Eliminar equipo externo de cliente' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clienteEquiposService.remove(id);
  }
}
