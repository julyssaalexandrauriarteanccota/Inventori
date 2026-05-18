import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AsignarClienteDto {
  @ApiProperty({ description: 'ID del cliente a asignar' })
  @IsUUID()
  clienteId: string;

  @ApiPropertyOptional({ description: 'ID de la venta asociada' })
  @IsOptional()
  @IsUUID()
  ventaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;
}
