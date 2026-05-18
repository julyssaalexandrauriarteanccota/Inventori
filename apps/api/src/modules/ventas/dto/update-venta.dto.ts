import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateVentaDto, DetalleVentaDto } from './create-venta.dto';

export class UpdateVentaDto extends PartialType(
  OmitType(CreateVentaDto, ['detalles'] as const),
) {
  @ApiPropertyOptional({
    description: 'Detalles actualizados de la venta',
    type: [DetalleVentaDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaDto)
  detalles?: DetalleVentaDto[];
}
