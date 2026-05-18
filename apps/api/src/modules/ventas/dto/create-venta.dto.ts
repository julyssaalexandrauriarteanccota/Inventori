import {
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsInt,
  IsNumber,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DetalleVentaDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsUUID()
  productoId: string;

  @ApiProperty({ description: 'Cantidad a vender' })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({ description: 'Precio unitario sin IGV' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioUnitario: number;

  @ApiPropertyOptional({ description: 'Descuento por línea' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  descuento?: number;

  @ApiPropertyOptional({
    description: 'Número de serie si es equipo serializado',
  })
  @IsOptional()
  @IsString()
  equipoSerie?: string;
}

export class CreateVentaDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsUUID()
  clienteId: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ description: 'Fecha de validez de la cotización' })
  @IsOptional()
  @IsDateString()
  validoHasta?: string;

  @ApiProperty({ description: 'Detalles de la venta', type: [DetalleVentaDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaDto)
  detalles: DetalleVentaDto[];
}
