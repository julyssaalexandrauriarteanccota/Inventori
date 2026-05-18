import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsInt,
  Min,
  IsOptional,
  IsString,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DetalleRecepcionDto {
  @ApiProperty({ description: 'ID del producto recibido' })
  @IsUUID()
  productoId: string;

  @ApiProperty({ description: 'Cantidad recibida' })
  @IsInt()
  @Min(1)
  cantidadRecibida: number;
}

export class CreateRecepcionDto {
  @ApiProperty({
    description: 'ID del almacén destino donde se recibe la mercadería',
  })
  @IsUUID()
  almacenDestinoId: string;

  @ApiPropertyOptional({ description: 'Notas de recepción' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({
    description: 'Detalles de productos recibidos',
    type: [DetalleRecepcionDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleRecepcionDto)
  detalles: DetalleRecepcionDto[];
}
