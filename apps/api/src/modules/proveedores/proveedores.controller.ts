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
import { ProveedoresService } from './proveedores.service';
import {
  CreateProveedorDto,
  UpdateProveedorDto,
  QueryProveedorDto,
} from './dto';
import { Roles } from '../../common/decorators';
import { ConsultaDocumentoClienteService } from '../clientes/consulta-documento-cliente.service';
import { ConsultaDocumentoClienteDto } from '../clientes/dto';

@ApiTags('Proveedores')
@ApiBearerAuth()
@Controller('proveedores')
export class ProveedoresController {
  constructor(
    private readonly proveedoresService: ProveedoresService,
    private readonly consultaDocumentoService: ConsultaDocumentoClienteService,
  ) {}

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Crear proveedor' })
  create(@Body() dto: CreateProveedorDto) {
    return this.proveedoresService.create(dto);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Listar proveedores (paginado)' })
  findAll(@Query() query: QueryProveedorDto) {
    return this.proveedoresService.findAll(query);
  }

  @Post('consulta-documento')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Consultar RUC con proveedor documental' })
  consultarDocumento(@Body() dto: ConsultaDocumentoClienteDto) {
    return this.consultaDocumentoService.consultar(dto);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Obtener proveedor por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.proveedoresService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Actualizar proveedor' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProveedorDto,
  ) {
    return this.proveedoresService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar proveedor (soft delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.proveedoresService.remove(id);
  }

  @Get(':id/productos')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Productos de este proveedor' })
  findProductos(@Param('id', ParseUUIDPipe) id: string) {
    return this.proveedoresService.findProductos(id);
  }
}
