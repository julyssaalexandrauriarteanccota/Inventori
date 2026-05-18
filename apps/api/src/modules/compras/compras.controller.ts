import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { RolUsuario } from '@erp/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ComprasService } from './compras.service';
import { AiService } from '../ai/ai.service';
import {
  CreateOrdenCompraDto,
  UpdateOrdenCompraDto,
  QueryOrdenCompraDto,
  CreateRecepcionDto,
  CreateCompraDirectaDto,
} from './dto';

@ApiTags('Compras')
@ApiBearerAuth()
@Controller('compras')
export class ComprasController {
  constructor(
    private readonly comprasService: ComprasService,
    private readonly aiService: AiService,
  ) {}

  @Post('ocr-factura')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Extraer datos de factura con OCR (AI)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  ocrFactura(@UploadedFile() file: Express.Multer.File) {
    return this.aiService.extractInvoiceData(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  @Post()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Crear orden de compra' })
  create(
    @Body() dto: CreateOrdenCompraDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.comprasService.create(dto, userId);
  }

  @Post('directa')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary:
      'Registrar compra directa (crea orden y recepción total en un solo paso)',
  })
  createDirecta(
    @Body() dto: CreateCompraDirectaDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.comprasService.createDirecta(dto, userId);
  }

  @Get()
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Listar órdenes de compra con filtros' })
  findAll(@Query() query: QueryOrdenCompraDto) {
    return this.comprasService.findAll(query);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Obtener orden de compra con detalles y recepciones',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.comprasService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Actualizar orden de compra en borrador' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrdenCompraDto,
  ) {
    return this.comprasService.update(id, dto);
  }

  @Patch(':id/aprobar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Aprobar orden de compra' })
  aprobar(@Param('id', ParseUUIDPipe) id: string) {
    return this.comprasService.aprobar(id);
  }

  @Post(':id/recepciones')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({
    summary: 'Registrar recepción de mercadería (total o parcial)',
  })
  createRecepcion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRecepcionDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.comprasService.createRecepcion(id, dto, userId);
  }

  @Patch(':id/cancelar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO)
  @ApiOperation({ summary: 'Cancelar orden de compra' })
  cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.comprasService.cancelar(id, userId);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMIN)
  @ApiOperation({
    summary: 'Eliminar orden de compra (solo BORRADOR o CANCELADA)',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.comprasService.remove(id);
  }
}
