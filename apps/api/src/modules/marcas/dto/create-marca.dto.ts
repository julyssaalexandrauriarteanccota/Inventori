import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoProducto } from '@erp/shared';

export class CreateMarcaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({
    enum: TipoProducto,
    isArray: true,
    default: [TipoProducto.EQUIPO],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(TipoProducto, { each: true })
  tipos?: TipoProducto[];
}
