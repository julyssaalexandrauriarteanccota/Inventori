import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CondicionProducto,
  EstadoComercialEquipo,
  EstadoEquipo,
} from '@erp/shared';

export class CreateEquipoDto {
  @ApiProperty({ description: 'Número de serie único del equipo' })
  @IsString()
  @IsNotEmpty()
  numeroSerie: string;

  @ApiProperty({ description: 'ID del producto (modelo) asociado' })
  @IsUUID()
  productoId: string;

  @ApiPropertyOptional({
    description: 'Almacén donde se encuentra físicamente la unidad',
  })
  @IsOptional()
  @IsUUID()
  almacenId?: string | null;

  @ApiPropertyOptional({ enum: EstadoEquipo })
  @IsOptional()
  @IsEnum(EstadoEquipo)
  estado?: EstadoEquipo;

  @ApiPropertyOptional({ enum: EstadoComercialEquipo })
  @IsOptional()
  @IsEnum(EstadoComercialEquipo)
  estadoComercial?: EstadoComercialEquipo;

  @ApiPropertyOptional({ enum: CondicionProducto })
  @IsOptional()
  @IsEnum(CondicionProducto)
  condicion?: CondicionProducto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  procedencia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  contadorInicial?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  contadorActual?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaIngreso?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacionEstado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigoQr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ubicacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firmware?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ description: 'IP del equipo para SNMP' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Community SNMP (default: public)' })
  @IsOptional()
  @IsString()
  snmpCommunity?: string;

  @ApiPropertyOptional({ description: 'Puerto SNMP (default: 161)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  snmpPort?: number;
}
