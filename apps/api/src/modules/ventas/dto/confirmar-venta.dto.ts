import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmarVentaDto {
  @ApiProperty({ description: 'ID del método de pago' })
  @IsUUID()
  metodoPagoId: string;

  @ApiPropertyOptional({
    description: 'Referencia de pago (número de transferencia, etc.)',
  })
  @IsOptional()
  @IsString()
  referenciaPago?: string;

  @ApiPropertyOptional({
    description: 'Archivo subido como evidencia de pago digital',
  })
  @IsOptional()
  @IsString()
  evidenciaPagoFilename?: string;

  @ApiProperty({ description: 'ID del almacén de donde se descontará stock' })
  @IsUUID()
  almacenId: string;
}
