import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { CondicionInspeccionAlquiler } from '@erp/shared';

export class FinalizarContratoAlquilerDto {
  @ApiProperty()
  @IsUUID()
  almacenId: string;

  @ApiPropertyOptional({ description: 'Contador al retornar el equipo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  contadorRetorno?: number;

  @ApiPropertyOptional({ enum: CondicionInspeccionAlquiler })
  @IsOptional()
  @IsEnum(CondicionInspeccionAlquiler)
  condicionRetorno?: CondicionInspeccionAlquiler;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cargoDanos?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cargoTransporte?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cargoMora?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositoAplicado?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  depositoDevuelto?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  metodoPagoDevolucionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenciaDevolucion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  evidenciaRetornoFilename?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notasInspeccion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notas?: string;
}
