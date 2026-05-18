import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsUUID,
  Min,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { CondicionProducto, TipoProducto } from '@erp/shared';

function transformBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }
  }

  return value;
}

export class QueryProductoDto {
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

  @ApiPropertyOptional({ description: 'Buscar por nombre, SKU o modelo' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TipoProducto })
  @IsOptional()
  @IsEnum(TipoProducto)
  tipo?: TipoProducto;

  @ApiPropertyOptional({
    description:
      'CSV de tipos a excluir (ej: "SERVICIO" o "EQUIPO,SERVICIO"). Útil para separar productos físicos de servicios.',
    example: 'SERVICIO',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string')
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    return value;
  })
  @IsEnum(TipoProducto, { each: true })
  excluirTipos?: TipoProducto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  marcaId?: string;

  @ApiPropertyOptional({ enum: CondicionProducto })
  @IsOptional()
  @IsEnum(CondicionProducto)
  condicion?: CondicionProducto;

  @ApiPropertyOptional({ description: 'Filtrar solo consumibles' })
  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  esConsumible?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar productos con número de serie' })
  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  tieneNumeroSerie?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por estado activo/inactivo' })
  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({
    description:
      'Solo productos con stock > 0 en al menos un almacén (los SERVICIO se incluyen siempre).',
  })
  @IsOptional()
  @Transform(({ value }) => transformBoolean(value))
  @IsBoolean()
  conStock?: boolean;
}
