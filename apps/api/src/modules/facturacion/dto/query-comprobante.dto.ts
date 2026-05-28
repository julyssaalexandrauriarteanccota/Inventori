import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDocumento, EstadoComprobante } from '@erp/shared';

export class QueryComprobanteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: TipoDocumento })
  @IsOptional()
  @IsEnum(TipoDocumento)
  tipo?: TipoDocumento;

  /**
   * Lista de tipos permitidos (CSV). Ej. `FACTURA,BOLETA`. Útil para
   * modal "Buscar comprobante origen" donde NC sólo admite factura/boleta.
   * Si se envía junto a `tipo`, gana `tipo` (más específico).
   */
  @ApiPropertyOptional({
    description: 'Lista CSV de tipos permitidos (filtra con OR).',
    example: 'FACTURA,BOLETA',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : value,
  )
  @IsEnum(TipoDocumento, { each: true })
  tipos?: TipoDocumento[];

  @ApiPropertyOptional({ enum: EstadoComprobante })
  @IsOptional()
  @IsEnum(EstadoComprobante)
  estado?: EstadoComprobante;

  /**
   * Lista de estados permitidos (CSV). Ej. `ACEPTADO,ACEPTADO_CON_OBSERVACIONES`.
   * Útil para listar comprobantes "facturables" desde el modal de búsqueda.
   */
  @ApiPropertyOptional({
    description: 'Lista CSV de estados permitidos (filtra con OR).',
    example: 'ACEPTADO,ACEPTADO_CON_OBSERVACIONES',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : value,
  )
  @IsEnum(EstadoComprobante, { each: true })
  estados?: EstadoComprobante[];

  @ApiPropertyOptional({ description: 'Buscar por serie o número' })
  @IsOptional()
  @IsString()
  search?: string;
}
