import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EstadoComercialEquipo, EstadoEquipo } from '@erp/shared';

export class QueryEquipoDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Buscar por serie, producto o ubicación',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: EstadoEquipo })
  @IsOptional()
  @IsEnum(EstadoEquipo)
  estado?: EstadoEquipo;

  @ApiPropertyOptional({ enum: EstadoComercialEquipo })
  @IsOptional()
  @IsEnum(EstadoComercialEquipo)
  estadoComercial?: EstadoComercialEquipo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  almacenId?: string;

  @ApiPropertyOptional({
    description:
      'Filtrar equipos asignados al cliente (asignación activa, fechaFin null)',
  })
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar equipos que aún no tienen ninguna garantía',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  sinGarantia?: boolean;
}
