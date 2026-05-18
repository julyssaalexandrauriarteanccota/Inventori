import {
  IsOptional,
  IsInt,
  Min,
  IsUUID,
  IsEnum,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EstadoGarantia } from '@erp/shared';

export class QueryGarantiaDto {
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

  @ApiPropertyOptional({ enum: EstadoGarantia })
  @IsOptional()
  @IsEnum(EstadoGarantia)
  estado?: EstadoGarantia;

  @ApiPropertyOptional({
    description: 'Buscar por serie, cliente, QR o modelo',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  equipoId?: string;
}
