import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export enum TipoMovimientoCajaDto {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
  VENTA = 'VENTA',
  DEVOLUCION = 'DEVOLUCION',
  RETIRO = 'RETIRO',
  DEPOSITO = 'DEPOSITO',
  AJUSTE = 'AJUSTE',
}

export class CreateMovimientoCajaDto {
  @ApiProperty({ enum: TipoMovimientoCajaDto })
  @IsEnum(TipoMovimientoCajaDto)
  tipo: TipoMovimientoCajaDto;

  @ApiProperty({ example: 50.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto: number;

  @ApiProperty({ example: 'Pago a proveedor' })
  @IsString()
  @MaxLength(500)
  concepto: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  metodoPagoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenciaTipo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenciaId?: string;
}
