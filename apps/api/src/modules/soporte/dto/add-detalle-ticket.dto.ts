import {
  IsUUID,
  IsInt,
  Min,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddDetalleTicketDto {
  @ApiProperty({ description: 'ID del item de catalogo (servicio o repuesto)' })
  @IsUUID()
  productoId: string;

  @ApiProperty({ description: 'Cantidad a registrar', minimum: 1 })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiPropertyOptional({ description: 'Precio unitario de la linea' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUnitario?: number;

  @ApiPropertyOptional({
    description: 'ID del almacen de donde se extrae el repuesto fisico',
  })
  @IsOptional()
  @IsUUID()
  almacenId?: string;

  @ApiPropertyOptional({
    description:
      'Si la linea esta cubierta por garantia (no se cobra al cliente)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  cubiertoGarantia?: boolean;

  @ApiPropertyOptional({ description: 'Notas sobre la linea' })
  @IsOptional()
  @IsString()
  notas?: string;
}
