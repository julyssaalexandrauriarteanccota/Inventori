import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

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

  @ApiPropertyOptional({ example: 'Av. Cliente 123' })
  @IsOptional()
  @IsString()
  direccionFiscal?: string;

  @ApiProperty({ enum: ['PENDIENTE', 'VALIDO', 'INVALIDO', 'ERROR'] })
  @IsIn(['PENDIENTE', 'VALIDO', 'INVALIDO', 'ERROR'])
  estado!: 'PENDIENTE' | 'VALIDO' | 'INVALIDO' | 'ERROR';

  @ApiPropertyOptional({ example: 'HABIDO' })
  @IsOptional()
  @IsString()
  condicionDomicilio?: string;
}
