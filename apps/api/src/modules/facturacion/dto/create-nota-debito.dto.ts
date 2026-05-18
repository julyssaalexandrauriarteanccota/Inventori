import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MOTIVOS_ND_TODOS, MotivoNDCodigo } from '@erp/shared';
import { NotaCreditoLineaDto } from './create-nota-credito.dto';

export class CreateNotaDebitoDto {
  @ApiProperty({ description: 'ID del comprobante origen (factura/boleta)' })
  @IsString()
  @IsNotEmpty()
  comprobanteOrigenId: string;

  @ApiProperty({
    description: 'Código Cat 10 SUNAT (01, 02, 03, 10, 11)',
    enum: MOTIVOS_ND_TODOS,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(MOTIVOS_ND_TODOS as readonly string[])
  motivoCodigo: MotivoNDCodigo;

  @ApiProperty({ description: 'Descripción libre del motivo (≥10 caracteres)' })
  @IsString()
  @IsNotEmpty()
  motivoDescripcion: string;

  @ApiProperty({
    description: 'Monto total a cobrar adicionalmente (incluye IGV)',
  })
  @IsNumber()
  @Min(0.01)
  monto: number;

  @ApiPropertyOptional({
    description: 'Líneas con el detalle del cargo adicional.',
    type: [NotaCreditoLineaDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotaCreditoLineaDto)
  lineas?: NotaCreditoLineaDto[];

  @ApiPropertyOptional({
    deprecated: true,
    description: 'DEPRECADO — usar motivoDescripcion',
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}
