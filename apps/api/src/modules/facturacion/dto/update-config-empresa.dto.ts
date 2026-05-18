import {
  IsOptional,
  IsString,
  IsEmail,
  IsNumber,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConfigEmpresaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  razonSocial?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ruc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombreComercial?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slogan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcionCorta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcionSeo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rubro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefonoVentas?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefonoSoporte?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsEmail()
  emailVentas?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsEmail()
  emailSoporte?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoDark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  favicon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colorPrimario?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  colorSecundario?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  heroTitulo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  heroSubtitulo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  catalogoDescripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactoDescripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  garantiaDescripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ticketDescripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pwaDescripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serieFactura?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serieBoleta?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serieNotaCredito?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serieNotaDebito?: string;

  @ApiPropertyOptional({ description: 'Porcentaje de IGV (ej: 18.00)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  porcentajeIGV?: number;
}
