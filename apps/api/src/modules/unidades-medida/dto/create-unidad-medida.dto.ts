import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SUNAT_UNIDAD_MEDIDA_CODES,
  sunatUnidadMedidaHelpText,
} from '@erp/shared';

const normalizeString = (
  value: unknown,
  format: (text: string) => string = (text) => text,
): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  return format(value.trim());
};

export class CreateUnidadMedidaDto {
  @ApiProperty({
    description: 'Código SUNAT/UBL de unidad de medida',
    example: 'NIU',
    enum: SUNAT_UNIDAD_MEDIDA_CODES,
  })
  @Transform(({ value }: { value: unknown }) =>
    normalizeString(value, (text) => text.toUpperCase()),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  @IsIn(SUNAT_UNIDAD_MEDIDA_CODES, {
    message: `Código de unidad no válido para SUNAT/UBL. ${sunatUnidadMedidaHelpText()}`,
  })
  codigo: string;

  @ApiProperty({
    description: 'Nombre descriptivo de la unidad',
    example: 'Unidad',
  })
  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @ApiPropertyOptional({ description: 'Descripción opcional' })
  @Transform(({ value }: { value: unknown }) => normalizeString(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  descripcion?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
