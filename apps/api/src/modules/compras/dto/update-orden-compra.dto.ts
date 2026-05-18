import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  CreateOrdenCompraDto,
  DetalleOrdenCompraDto,
} from './create-orden-compra.dto';

export class UpdateOrdenCompraDto extends PartialType(
  OmitType(CreateOrdenCompraDto, ['detalles'] as const),
) {
  @ApiPropertyOptional({
    description: 'Detalles actualizados de la orden',
    type: [DetalleOrdenCompraDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleOrdenCompraDto)
  detalles?: DetalleOrdenCompraDto[];
}
