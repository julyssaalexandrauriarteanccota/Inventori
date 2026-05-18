import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReverseGeocodeDto {
  @ApiProperty({ description: 'Latitud decimal' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud: number;

  @ApiProperty({ description: 'Longitud decimal' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud: number;
}
