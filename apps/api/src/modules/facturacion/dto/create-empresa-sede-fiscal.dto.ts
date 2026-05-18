import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class CreateEmpresaSedeFiscalDto {
  @ApiProperty({ example: 'Sede principal' })
  @IsString()
  nombre!: string;

  @ApiProperty({ example: '0000' })
  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'El código de establecimiento SUNAT debe tener 4 dígitos',
  })
  codigoEstablecimientoSunat!: string;

  @ApiProperty({ example: 'Av. Fiscal 123' })
  @IsString()
  direccion!: string;

  @ApiProperty({ example: '150101' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El ubigeo debe tener 6 dígitos' })
  ubigeo!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
