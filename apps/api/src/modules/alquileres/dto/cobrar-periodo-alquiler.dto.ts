import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CobrarPeriodoAlquilerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  metodoPagoId?: string;

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
