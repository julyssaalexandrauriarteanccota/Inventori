import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsBoolean,
  IsNumber,
  Length,
  ValidateIf,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCliente } from '@erp/shared';

type ClienteWithTipo = {
  tipo: TipoCliente;
  esGenerico?: boolean;
};

const isClienteNatural = ({ tipo, esGenerico }: ClienteWithTipo): boolean =>
  tipo === TipoCliente.NATURAL && esGenerico !== true;

const isClienteEmpresa = ({ tipo }: ClienteWithTipo): boolean =>
  tipo === TipoCliente.EMPRESA;

export class CreateClienteDto {
  @ApiProperty({ enum: TipoCliente })
  @IsEnum(TipoCliente)
  @IsNotEmpty()
  tipo: TipoCliente;

  @ApiPropertyOptional()
  @ValidateIf(isClienteNatural)
  @IsString()
  @IsNotEmpty({ message: 'Nombre es obligatorio para persona natural' })
  nombre?: string;

  @ApiPropertyOptional()
  @ValidateIf(isClienteNatural)
  @IsString()
  @IsNotEmpty({ message: 'Apellido es obligatorio para persona natural' })
  apellido?: string;

  @ApiPropertyOptional({
    description: 'DNI — 8 dígitos, obligatorio para NATURAL',
  })
  @ValidateIf(isClienteNatural)
  @IsString()
  @Length(8, 8, { message: 'DNI debe tener exactamente 8 dígitos' })
  dni?: string;

  @ApiPropertyOptional({
    description: 'Razón social — obligatorio para EMPRESA',
  })
  @ValidateIf(isClienteEmpresa)
  @IsString()
  @IsNotEmpty({ message: 'Razón social es obligatoria para empresa' })
  razonSocial?: string;

  @ApiPropertyOptional({
    description: 'RUC — 11 dígitos, obligatorio para EMPRESA',
  })
  @ValidateIf(isClienteEmpresa)
  @IsString()
  @Length(11, 11, { message: 'RUC debe tener exactamente 11 dígitos' })
  ruc?: string;

  @ApiPropertyOptional()
  @ValidateIf(
    (_, value) => value !== undefined && value !== null && value !== '',
  )
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  celular?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  distrito?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provincia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departamento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referencia?: string;

  @ApiPropertyOptional({
    description: 'Latitud exacta seleccionada en el mapa',
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number | null;

  @ApiPropertyOptional({
    description: 'Longitud exacta seleccionada en el mapa',
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Cliente genérico (Público en General)',
  })
  @IsOptional()
  @IsBoolean()
  esGenerico?: boolean;
}
