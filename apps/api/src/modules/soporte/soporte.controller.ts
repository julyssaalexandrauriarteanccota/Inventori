import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { RolUsuario } from '@erp/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SoporteService } from './soporte.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  QueryTicketDto,
  AddDetalleTicketDto,
  AddRepuestoDto,
  UpdateDetalleTicketDto,
  CerrarTicketDto,
} from './dto';

@ApiTags('Soporte')
@ApiBearerAuth()
@Controller('soporte')
export class SoporteController {
  constructor(
    private readonly soporteService: SoporteService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Post('tickets')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Crear ticket de soporte' })
  create(
    @Body() dto: CreateTicketDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.soporteService.create(dto, userId, userRol);
  }

  @Get('tickets')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Listar tickets con filtros y paginación' })
  findAll(
    @Query() query: QueryTicketDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.soporteService.findAll(query, userId, userRol);
  }

  @Get('tickets/:id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Obtener ticket por ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.soporteService.findOne(id, userId, userRol);
  }

  @Patch('tickets/:id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Actualizar ticket' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.soporteService.update(id, dto, userId, userRol);
  }

  @Post('tickets/:id/repuestos')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({
    summary: 'Agregar repuesto al ticket (alias heredado de detalles)',
  })
  addRepuesto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddRepuestoDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.soporteService.addDetalle(id, dto, userId, userRol);
  }

  @Post('tickets/:id/detalles')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({
    summary: 'Agregar linea al ticket (servicio o repuesto)',
  })
  addDetalle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddDetalleTicketDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.soporteService.addDetalle(id, dto, userId, userRol);
  }

  @Patch('tickets/:id/detalles/:detalleId')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({
    summary:
      'Actualizar detalle del ticket (cantidad, precio, garantía, notas)',
  })
  updateDetalle(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('detalleId', ParseUUIDPipe) detalleId: string,
    @Body() dto: UpdateDetalleTicketDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.soporteService.updateDetalle(
      id,
      detalleId,
      dto,
      userId,
      userRol,
    );
  }

  @Delete('tickets/:id/detalles/:detalleId')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({
    summary:
      'Eliminar detalle del ticket (revierte stock si es repuesto físico)',
  })
  removeDetalle(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('detalleId', ParseUUIDPipe) detalleId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.soporteService.removeDetalle(id, detalleId, userId, userRol);
  }

  @Post('tickets/:id/adjuntos')
  @Roles(RolUsuario.TECNICO)
  @ApiOperation({
    summary: 'Subir adjunto al ticket (solo técnico asignado)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  addAdjunto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    this.uploadsService.validateFile(file);
    const savedFile = this.uploadsService.saveFile(file);
    return this.soporteService.addAdjunto(
      id,
      {
        url: savedFile.path,
        nombre: file.originalname,
        tipo: file.mimetype,
        tamano: file.size,
      },
      userId,
    );
  }

  @Delete('tickets/:id/adjuntos/:adjuntoId')
  @Roles(RolUsuario.TECNICO)
  @ApiOperation({
    summary: 'Eliminar adjunto del ticket (solo técnico asignado)',
  })
  removeAdjunto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('adjuntoId', ParseUUIDPipe) adjuntoId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.soporteService.removeAdjunto(id, adjuntoId, userId);
  }

  @Patch('tickets/:id/cerrar')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({ summary: 'Cerrar ticket con cálculo de monto total' })
  cerrar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CerrarTicketDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.soporteService.cerrar(id, dto, userId, userRol);
  }

  @Get('tickets/:codigo/publico')
  @Public()
  @ApiOperation({ summary: 'Consulta pública de ticket por código (sin auth)' })
  findByCodigo(@Param('codigo') codigo: string) {
    return this.soporteService.findByCodigo(codigo);
  }

  @Delete('tickets/:id')
  @Roles(RolUsuario.ADMIN, RolUsuario.ENCARGADO, RolUsuario.TECNICO)
  @ApiOperation({
    summary: 'Eliminar definitivamente un ticket',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('rol') userRol: RolUsuario,
  ) {
    return this.soporteService.remove(id, userId, userRol);
  }
}
