import { IsInt, IsOptional, IsString, Min, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLecturaSNMPDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  nivelTonerNegro?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  nivelTonerCian?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  nivelTonerMagenta?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  nivelTonerAmarillo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  paginasTotales?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  erroresActivos?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estadoFusor?: string;

  @ApiPropertyOptional({ description: 'Datos crudos SNMP en formato JSON' })
  @IsOptional()
  rawData?: any;
}
