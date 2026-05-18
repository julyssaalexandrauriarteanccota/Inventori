import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCasoGarantiaDto {
  @ApiProperty({ description: 'Descripción del problema/reclamo' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiPropertyOptional({ description: 'ID del ticket de soporte asociado' })
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @ApiPropertyOptional({
    description:
      'Si la garantía se acepta para el caso. Por defecto true al crear desde un ticket en garantía vigente.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  aceptada?: boolean;

  @ApiPropertyOptional({
    description: 'Motivo del rechazo (requerido si aceptada=false)',
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}
