import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoComunicacionBaja } from '@erp/shared';

export class QueryComunicacionBajaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: EstadoComunicacionBaja })
  @IsOptional()
  @IsEnum(EstadoComunicacionBaja)
  estado?: EstadoComunicacionBaja;

  @ApiPropertyOptional({
    description: 'Buscar por identificador, número o cliente',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
