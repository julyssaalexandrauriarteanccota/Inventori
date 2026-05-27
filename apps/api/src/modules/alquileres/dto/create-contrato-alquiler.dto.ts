import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateContratoAlquilerDto {
  @ApiProperty()
  @IsUUID()
  clienteId: string;

  @ApiProperty()
  @IsUUID()
  equipoId: string;

  @ApiProperty({ example: '2026-05-26' })
  @IsDateString()
  fechaInicio: string;

  @ApiPropertyOptional({ default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  mesesPlazo?: number;

  @ApiProperty({ example: 10000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  copiasIncluidasMes: number;

  @ApiProperty({ example: 800 })
  @Type(() => Number)
  @Min(0.01)
  precioMensual: number;

  @ApiProperty({ example: 0.08 })
  @Type(() => Number)
  @Min(0)
  precioCopiaExcedente: number;

  @ApiPropertyOptional({
    default: 0,
    description: 'Depósito económico reembolsable',
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  depositoGarantia?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  contadorInicio?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notas?: string;
}
