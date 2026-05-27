import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class ActivarContratoAlquilerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  metodoPagoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  contadorInicial?: number;

  @ApiPropertyOptional({
    description: 'Referencia de pago digital, operación o transferencia',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenciaPago?: string;

  @ApiPropertyOptional({
    description: 'Archivo subido como evidencia de pago digital',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  evidenciaPagoFilename?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notas?: string;
}
