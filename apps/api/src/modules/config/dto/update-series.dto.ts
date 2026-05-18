import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSeriesDto {
  @ApiPropertyOptional({ example: 'F001' })
  @IsOptional()
  @IsString()
  serieFactura?: string;

  @ApiPropertyOptional({ example: 'B001' })
  @IsOptional()
  @IsString()
  serieBoleta?: string;

  @ApiPropertyOptional({ example: 'FC01' })
  @IsOptional()
  @IsString()
  serieNotaCredito?: string;

  @ApiPropertyOptional({ example: 'FD01' })
  @IsOptional()
  @IsString()
  serieNotaDebito?: string;
}
