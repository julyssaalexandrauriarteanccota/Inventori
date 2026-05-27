import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class RegistrarLecturaAlquilerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periodoId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  contador: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fechaLectura?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notas?: string;
}
