import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class QueryClienteValidacionSunatDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @ApiPropertyOptional({
    enum: ['PENDIENTE', 'VALIDO', 'ACTIVO', 'INVALIDO', 'ERROR'],
  })
  @IsOptional()
  @IsIn(['PENDIENTE', 'VALIDO', 'ACTIVO', 'INVALIDO', 'ERROR'])
  estado?: 'PENDIENTE' | 'VALIDO' | 'ACTIVO' | 'INVALIDO' | 'ERROR';

  @ApiPropertyOptional({
    description: 'Buscar por documento, nombre o dirección',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
