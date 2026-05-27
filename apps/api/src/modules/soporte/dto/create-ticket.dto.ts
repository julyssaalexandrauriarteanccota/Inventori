import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrioridadTicket, TipoServicio } from '@erp/shared';
import { AddDetalleTicketDto } from './add-detalle-ticket.dto';

export class CreateTicketDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsUUID()
  clienteId: string;

  @ApiPropertyOptional({ description: 'ID del equipo (si aplica)' })
  @IsOptional()
  @IsUUID()
  equipoId?: string | null;

  @ApiPropertyOptional({
    description: 'ID del equipo externo del cliente (si aplica)',
  })
  @IsOptional()
  @IsUUID()
  clienteEquipoId?: string | null;

  @ApiPropertyOptional({ description: 'ID del técnico asignado' })
  @IsOptional()
  @IsUUID()
  tecnicoId?: string;

  @ApiProperty({ description: 'Título del ticket', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  titulo: string;

  @ApiProperty({ description: 'Descripción del problema' })
  @IsString()
  descripcion: string;

  @ApiPropertyOptional({ description: 'Falla reportada por el cliente' })
  @IsOptional()
  @IsString()
  fallaReportada?: string;

  @ApiPropertyOptional({
    enum: PrioridadTicket,
    default: PrioridadTicket.MEDIA,
  })
  @IsOptional()
  @IsEnum(PrioridadTicket)
  prioridad?: PrioridadTicket;

  @ApiPropertyOptional({ enum: TipoServicio, default: TipoServicio.TALLER })
  @IsOptional()
  @IsEnum(TipoServicio)
  tipoServicio?: TipoServicio;

  @ApiPropertyOptional({ description: 'Fecha prometida de entrega' })
  @IsOptional()
  @IsDateString()
  fechaPromesa?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ description: 'Monto de mano de obra' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  montoManoObra?: number;

  @ApiPropertyOptional({
    description: 'Lineas iniciales del ticket (servicios o repuestos)',
    type: [AddDetalleTicketDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddDetalleTicketDto)
  detalles?: AddDetalleTicketDto[];
}
