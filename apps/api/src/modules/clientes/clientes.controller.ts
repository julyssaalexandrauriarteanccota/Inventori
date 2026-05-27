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
import { ClientesService } from './clientes.service';
import {
  CreateClienteDto,
  UpdateClienteDto,
  QueryClienteDto,
  CreateContactoClienteDto,
  ConsultaDocumentoClienteDto,
} from './dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { ConsultaDocumentoClienteService } from './consulta-documento-cliente.service';

@ApiTags('Clientes')
@ApiBearerAuth()
@Controller('clientes')
export class ClientesController {
  constructor(
    private readonly clientesService: ClientesService,
    private readonly consultaDocumentoService: ConsultaDocumentoClienteService,
  ) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Crear cliente' })
  create(@Body() dto: CreateClienteDto) {
    return this.clientesService.create(dto);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar clientes (paginado)' })
  findAll(@Query() query: QueryClienteDto) {
    return this.clientesService.findAll(query);
  }

  @Post('consulta-documento')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Consultar DNI/RUC con proveedor documental' })
  consultarDocumento(@Body() dto: ConsultaDocumentoClienteDto) {
    return this.consultaDocumentoService.consultar(dto);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientesService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.clientesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar cliente (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientesService.remove(id);
  }

  // Sub-recursos
  @Get(':id/equipos')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Equipos del cliente' })
  findEquipos(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientesService.findEquipos(id);
  }

  @Get(':id/tickets')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Tickets del cliente' })
  findTickets(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientesService.findTickets(id);
  }

  // Interacciones CRM
  @Post(':id/contactos')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Registrar interacción CRM con el cliente' })
  createContacto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContactoClienteDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.clientesService.createContacto(id, dto, userId);
  }

  @Get(':id/contactos')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Listar interacciones CRM del cliente' })
  findContactos(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientesService.findContactos(id);
  }
}
