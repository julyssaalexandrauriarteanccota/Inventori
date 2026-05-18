import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompatibilidadDto {
  @ApiProperty({ description: 'ID del producto que es modelo/equipo' })
  @IsUUID()
  modeloId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;
}
