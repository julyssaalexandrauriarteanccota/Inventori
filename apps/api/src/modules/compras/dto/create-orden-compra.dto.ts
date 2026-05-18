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

export class DetalleOrdenCompraDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsUUID()
  productoId: string;

  @ApiProperty({ description: 'Cantidad a comprar' })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({ description: 'Precio unitario sin IGV' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioUnitario: number;
}

export class CreateOrdenCompraDto {
  @ApiProperty({ description: 'ID del proveedor' })
  @IsUUID()
  proveedorId: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ description: 'Fecha esperada de entrega' })
  @IsOptional()
  @IsDateString()
  fechaEsperada?: string;

  @ApiProperty({
    description: 'Detalles de la orden',
    type: [DetalleOrdenCompraDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleOrdenCompraDto)
  detalles: DetalleOrdenCompraDto[];
}
