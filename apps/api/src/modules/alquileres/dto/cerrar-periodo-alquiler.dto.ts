import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CerrarPeriodoAlquilerDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lecturaFinal: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notas?: string;
}
