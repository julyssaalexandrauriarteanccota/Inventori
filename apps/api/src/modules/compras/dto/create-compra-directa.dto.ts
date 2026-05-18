import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DetalleOrdenCompraDto } from './create-orden-compra.dto';

export class CreateCompraDirectaDto {
  @ApiProperty({ description: 'ID del proveedor' })
  @IsUUID()
  proveedorId: string;

  @ApiProperty({
    description: 'ID del almacén destino donde ingresará la mercadería',
  })
  @IsUUID()
  almacenDestinoId: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({
    description: 'Detalles de la compra',
    type: [DetalleOrdenCompraDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleOrdenCompraDto)
  detalles: DetalleOrdenCompraDto[];
}
