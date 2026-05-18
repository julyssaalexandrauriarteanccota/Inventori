import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCasoGarantiaDto {
  @ApiPropertyOptional({ description: 'Resolución del caso' })
  @IsOptional()
  @IsString()
  resolucion?: string;

  @ApiPropertyOptional({
    description: 'Si la garantía fue aceptada para el caso',
  })
  @IsOptional()
  @IsBoolean()
  aceptada?: boolean;

  @ApiPropertyOptional({
    description: 'Motivo del rechazo (si aceptada=false)',
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}
