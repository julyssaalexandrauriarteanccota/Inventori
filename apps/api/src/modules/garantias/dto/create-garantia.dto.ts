import {
  IsUUID,
  IsDateString,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoGarantia } from '@erp/shared';

export class CreateGarantiaDto {
  @ApiProperty({ description: 'ID del equipo' })
  @IsUUID()
  equipoId: string;

  @ApiPropertyOptional({ description: 'ID de la venta asociada' })
  @IsOptional()
  @IsUUID()
  ventaId?: string;

  @ApiPropertyOptional({
    description: 'Tipo de documento del cliente original',
  })
  @IsOptional()
  @IsString()
  clienteDocTipo?: string;

  @ApiPropertyOptional({
    description: 'Número de documento del cliente original',
  })
  @IsOptional()
  @IsString()
  clienteDocNumero?: string;

  @ApiPropertyOptional({ description: 'Nombre del cliente original' })
  @IsOptional()
  @IsString()
  clienteNombre?: string;

  @ApiProperty({ description: 'Fecha de inicio de la garantía (ISO 8601)' })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({ description: 'Fecha de fin de la garantía (ISO 8601)' })
  @IsDateString()
  fechaFin: string;

  @ApiProperty({ description: 'Descripción de la cobertura' })
  @IsString()
  @IsNotEmpty()
  cobertura: string;

  @ApiPropertyOptional({ description: 'Descripción de las exclusiones' })
  @IsOptional()
  @IsString()
  exclusiones?: string;

  @ApiPropertyOptional({ enum: EstadoGarantia })
  @IsOptional()
  @IsEnum(EstadoGarantia)
  estado?: EstadoGarantia;

  @ApiPropertyOptional({
    description:
      'Si es true, usa equipo.contadorActual como base. Por defecto usa equipo.contadorInicial.',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  usarContadorActual?: boolean;

  @ApiPropertyOptional({
    description:
      'Tope máximo de copias cubiertas. Si se omite se toma de producto.garantiaMaxCopias.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  contadorMaxCopias?: number;
}
