import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AmbienteSunat, TipoDocumento } from '@erp/shared';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class QuerySerieDocumentoDto {
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

  @ApiPropertyOptional({ enum: TipoDocumento })
  @IsOptional()
  @IsEnum(TipoDocumento)
  tipo?: TipoDocumento;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ enum: AmbienteSunat })
  @IsOptional()
  @IsEnum(AmbienteSunat)
  ambiente?: AmbienteSunat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sedeFiscalId?: string;

  @ApiPropertyOptional({ description: 'Buscar por serie, sede o descripción' })
  @IsOptional()
  @IsString()
  search?: string;
}
