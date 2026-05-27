import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoEquipo } from '@erp/shared';

export class CreateClienteEquipoDto {
  @ApiProperty({ description: 'ID del cliente propietario del equipo' })
  @IsUUID()
  clienteId: string;

  @ApiPropertyOptional({
    description: 'Producto de catálogo equivalente, si existe',
  })
  @IsOptional()
  @IsUUID()
  productoId?: string;

  @ApiPropertyOptional({
    description:
      'Número de serie del equipo del cliente, si se conoce. Si se omite, el sistema genera un código interno.',
  })
  @IsOptional()
  @IsString()
  numeroSerie?: string;

  @ApiProperty({
    description: 'Nombre descriptivo si no está vinculado al catálogo',
  })
  @IsString()
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiPropertyOptional({ enum: EstadoEquipo })
  @IsOptional()
  @IsEnum(EstadoEquipo)
  estado?: EstadoEquipo;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigoQr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ubicacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;
}
