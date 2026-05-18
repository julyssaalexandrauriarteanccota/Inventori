import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsBoolean,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProveedorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razonSocial: string;

  @ApiProperty({ description: 'RUC — 11 dígitos, empieza con 10 o 20' })
  @IsString()
  @Length(11, 11, { message: 'RUC debe tener exactamente 11 dígitos' })
  @Matches(/^(10|20)\d{9}$/, { message: 'RUC debe empezar con 10 o 20' })
  ruc: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactoNombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactoTelefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
