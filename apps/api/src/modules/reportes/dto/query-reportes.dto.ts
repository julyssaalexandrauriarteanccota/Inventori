import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsString,
} from 'class-validator';

export class QueryReporteVentasDto {
  @ApiPropertyOptional({ description: 'Fecha inicio (ISO)' })
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiPropertyOptional({ description: 'Fecha fin (ISO)' })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado de venta' })
  @IsOptional()
  @IsString()
  estado?: string;
}

export class QueryReporteTicketsDto {
  @ApiPropertyOptional({ description: 'Fecha inicio (ISO)' })
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiPropertyOptional({ description: 'Fecha fin (ISO)' })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado de ticket' })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ description: 'Filtrar por técnico' })
  @IsOptional()
  @IsString()
  tecnicoId?: string;
}

export class QueryReporteStockDto {
  @ApiPropertyOptional({
    description: 'Solo stock bajo mínimo',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  stockBajo?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por almacén' })
  @IsOptional()
  @IsString()
  almacenId?: string;
}

export class QueryReporteClientesDto {
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
}

export class QueryTelemetriaDto {
  @ApiPropertyOptional({ description: 'Fecha inicio (ISO)' })
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @ApiPropertyOptional({ description: 'Fecha fin (ISO)' })
  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}
