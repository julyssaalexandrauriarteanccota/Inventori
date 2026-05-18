import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';

export class QueryAuditoriaDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filtrar por userId' })
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por modelo (ej: clientes, ventas)',
  })
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por acción (CREAR, ACTUALIZAR, ELIMINAR)',
  })
  @IsOptional()
  @IsString()
  accion?: string;

  @ApiPropertyOptional({
    description: 'Buscar por modelo, acción, referencia o usuario',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Fecha inicio (ISO)' })
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiPropertyOptional({ description: 'Fecha fin (ISO)' })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}
