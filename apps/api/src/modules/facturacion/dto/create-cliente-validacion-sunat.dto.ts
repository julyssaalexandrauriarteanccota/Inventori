import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateClienteValidacionSunatDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @ApiProperty({
    example: '6',
    enum: ['6', '1', '0'],
    description:
      'Documentos soportados por Clientes: RUC (6), DNI (1) o sin documento/público general (0)',
  })
  @IsString()
  @IsIn(['6', '1', '0'], {
    message:
      'Solo se soporta RUC (6), DNI (1) o sin documento (0) para clientes',
  })
  tipoDocumentoSunat!: '6' | '1' | '0';

  @ApiProperty({
    example: '20123456789',
    description:
      'RUC de 11 dígitos que empieza con 10 o 20, DNI de 8 dígitos o 00000000 para sin documento',
  })
  @IsString()
  numeroDocumento!: string;

  @ApiPropertyOptional({ example: 'CLIENTE DEMO SAC' })
  @IsOptional()
  @IsString()
  nombreNormalizado?: string;

  @ApiPropertyOptional({
    enum: ['SUNAT_PADRON_LOCAL', 'DECOLECTA', 'APISPERU', 'MANUAL'],
  })
  @IsOptional()
  @IsIn(['SUNAT_PADRON_LOCAL', 'DECOLECTA', 'APISPERU', 'MANUAL'])
  proveedor?: 'SUNAT_PADRON_LOCAL' | 'DECOLECTA' | 'APISPERU' | 'MANUAL';

  @ApiPropertyOptional({ example: 'Av. Cliente 123' })
  @IsOptional()
  @IsString()
  direccionFiscal?: string;

  @ApiPropertyOptional({ example: '150131' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El ubigeo debe tener 6 dígitos' })
  ubigeo?: string;

  @ApiPropertyOptional({ example: 'LIMA' })
  @IsOptional()
  @IsString()
  departamento?: string;

  @ApiPropertyOptional({ example: 'LIMA' })
  @IsOptional()
  @IsString()
  provincia?: string;

  @ApiPropertyOptional({ example: 'SAN ISIDRO' })
  @IsOptional()
  @IsString()
  distrito?: string;

  @ApiProperty({ enum: ['PENDIENTE', 'VALIDO', 'ACTIVO', 'INVALIDO', 'ERROR'] })
  @IsIn(['PENDIENTE', 'VALIDO', 'ACTIVO', 'INVALIDO', 'ERROR'])
  estado!: 'PENDIENTE' | 'VALIDO' | 'ACTIVO' | 'INVALIDO' | 'ERROR';

  @ApiPropertyOptional({ example: 'HABIDO' })
  @IsOptional()
  @IsString()
  condicionDomicilio?: string;
}
