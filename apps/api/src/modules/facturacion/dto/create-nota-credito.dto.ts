import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MOTIVOS_NC_TODOS, MotivoNCCodigo } from '@erp/shared';

export class NotaCreditoLineaDto {
  @ApiProperty({ description: 'Número de ítem (1..n)' })
  @IsNumber()
  @Min(1)
  item: number;

  @ApiProperty({ description: 'Descripción del ítem que se acredita' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ description: 'Cantidad acreditada' })
  @IsNumber()
  @Min(0.0001)
  cantidad: number;

  @ApiProperty({ description: 'Precio unitario (en moneda del origen)' })
  @IsNumber()
  @Min(0)
  precioUnitario: number;

  @ApiProperty({ description: 'Total de la línea (cantidad × precio)' })
  @IsNumber()
  @Min(0.01)
  total: number;
}

export class CreateNotaCreditoDto {
  @ApiProperty({ description: 'ID del comprobante origen (factura/boleta/NC)' })
  @IsString()
  @IsNotEmpty()
  comprobanteOrigenId: string;

  @ApiProperty({
    description: 'Código Cat 09 SUNAT (01..13)',
    enum: MOTIVOS_NC_TODOS,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(MOTIVOS_NC_TODOS as readonly string[])
  motivoCodigo: MotivoNCCodigo;

  @ApiProperty({ description: 'Descripción libre del motivo (≥10 caracteres)' })
  @IsString()
  @IsNotEmpty()
  motivoDescripcion: string;

  @ApiPropertyOptional({
    description:
      'Marca como excepcional (Doc 08 §3): plazo 10 días hábiles, sólo motivos 01/02',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  esExcepcional?: boolean;

  @ApiPropertyOptional({
    description:
      'Anula totalmente el comprobante origen. Si true, monto debe igualar saldo no acreditado.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  anulaTotalmente?: boolean;

  @ApiProperty({ description: 'Monto total acreditado (incluye IGV)' })
  @IsNumber()
  @Min(0.01)
  monto: number;

  @ApiPropertyOptional({
    description: 'Líneas afectadas. Obligatorio si no anula totalmente.',
    type: [NotaCreditoLineaDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotaCreditoLineaDto)
  lineas?: NotaCreditoLineaDto[];

  /**
   * Compatibilidad retroactiva con la versión anterior del DTO. La UI nueva
   * usa motivoCodigo + motivoDescripcion; clientes legacy enviaban tipo+motivo.
   */
  @ApiPropertyOptional({
    deprecated: true,
    description: 'DEPRECADO — usar motivoCodigo (alias de Cat 09)',
  })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional({
    deprecated: true,
    description: 'DEPRECADO — usar motivoDescripcion',
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}
