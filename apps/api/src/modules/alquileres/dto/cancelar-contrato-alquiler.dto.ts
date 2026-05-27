import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CancelarContratoAlquilerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  almacenId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notas?: string;
}
