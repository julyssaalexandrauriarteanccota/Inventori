import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiProperty({ description: 'Código corto de la unidad', example: 'UND' })
  @Transform(({ value }: { value: unknown }) =>
    normalizeString(value, (text) => text.toUpperCase()),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
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
