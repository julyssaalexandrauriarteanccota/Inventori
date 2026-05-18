import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryFeriadoNacionalDto {
  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio?: number;
}

export class CreateFeriadoNacionalDto {
  @ApiProperty({ example: '2026-07-28' })
  @IsDateString()
  fecha!: string;

  @ApiProperty({ example: 'Fiestas Patrias' })
  @IsString()
  nombre!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  esNoLaborable?: boolean;
}

export class UpdateFeriadoNacionalDto {
  @ApiPropertyOptional({ example: '2026-07-28' })
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @ApiPropertyOptional({ example: 'Fiestas Patrias' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  esNoLaborable?: boolean;
}
