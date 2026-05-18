import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MovimientoComportamiento } from '@erp/shared';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTipoMovimientoConfigDto {
  @ApiProperty({ example: 'Ajuste por inventario cíclico' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({
    enum: MovimientoComportamiento,
    example: MovimientoComportamiento.SALIDA,
  })
  @IsEnum(MovimientoComportamiento)
  comportamiento!: MovimientoComportamiento;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 999 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  orden?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiereJustificacion?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiereEvidencia?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  disponibleTecnico?: boolean;
}
