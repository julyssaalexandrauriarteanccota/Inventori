import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDetalleTicketDto {
  @ApiPropertyOptional({ description: 'Cantidad consumida', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  @ApiPropertyOptional({ description: 'Precio unitario' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUnitario?: number;

  @ApiPropertyOptional({
    description: 'Si la línea está cubierta por garantía (no se cobra)',
  })
  @IsOptional()
  @IsBoolean()
  cubiertoGarantia?: boolean;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notas?: string;
}
