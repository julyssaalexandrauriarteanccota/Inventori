import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMovimientoDto {
  @ApiProperty({ example: 'VENTA' })
  @IsString()
  @IsNotEmpty()
  tipo!: string;

  @ApiProperty()
  @IsUUID()
  productoId!: string;

  @ApiPropertyOptional({
    description:
      'Almacén de origen (requerido según el comportamiento del tipo)',
  })
  @IsOptional()
  @IsUUID()
  almacenOrigenId?: string;

  @ApiPropertyOptional({
    description: 'Almacén destino (requerido según el comportamiento del tipo)',
  })
  @IsOptional()
  @IsUUID()
  almacenDestinoId?: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad!: number;

  @ApiPropertyOptional({
    description: 'ID de referencia (venta, ticket, orden de compra, etc.)',
  })
  @IsOptional()
  @IsString()
  referenciaId?: string;

  @ApiPropertyOptional({
    description: 'Tipo de referencia (VENTA, TICKET, ORDEN_COMPRA, etc.)',
  })
  @IsOptional()
  @IsString()
  referenciaTipo?: string;

  @ApiPropertyOptional({
    description: 'Justificación obligatoria si el tipo configurado lo requiere',
  })
  @IsOptional()
  @IsString()
  justificacion?: string;

  @ApiPropertyOptional({
    description:
      'Nombre de archivo subido previamente en /uploads. Obligatorio si el tipo configurado requiere evidencia',
  })
  @IsOptional()
  @IsString()
  evidenciaFilename?: string;
}
