import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CerrarTicketDto {
  @ApiPropertyOptional({ description: 'Solución aplicada al cierre' })
  @IsOptional()
  @IsString()
  solucion?: string;

  @ApiPropertyOptional({ description: 'Monto de mano de obra' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  montoManoObra?: number;

  @ApiPropertyOptional({
    description:
      'Monto de repuestos. Si se omite, se calcula desde los detalles (no SERVICIO).',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  montoRepuestos?: number;

  @ApiPropertyOptional({
    description:
      'Monto total. Si se omite, se calcula como manoObra + repuestos.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  montoTotal?: number;

  @ApiPropertyOptional({ description: 'Firma del cliente (base64 o URL)' })
  @IsOptional()
  @IsString()
  firmaCliente?: string;

  @ApiPropertyOptional({
    description: 'Latitud de geolocalización de la firma',
  })
  @IsOptional()
  @IsNumber()
  firmaGeoLat?: number;

  @ApiPropertyOptional({
    description: 'Longitud de geolocalización de la firma',
  })
  @IsOptional()
  @IsNumber()
  firmaGeoLng?: number;

  @ApiPropertyOptional({ description: 'Notas de cierre' })
  @IsOptional()
  @IsString()
  notas?: string;
}
