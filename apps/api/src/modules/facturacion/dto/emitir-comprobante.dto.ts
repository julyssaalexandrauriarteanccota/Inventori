import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDocumento } from '@erp/shared';

export class EmitirComprobanteDto {
  @ApiProperty({ description: 'ID de la venta a facturar' })
  @IsUUID()
  ventaId: string;

  @ApiProperty({
    enum: ['FACTURA', 'BOLETA'],
    description: 'Tipo de documento a emitir',
  })
  @IsEnum(TipoDocumento, { message: 'Tipo debe ser FACTURA o BOLETA' })
  tipo: TipoDocumento;

  @ApiPropertyOptional({
    description:
      'Serie documental elegida para previsualizar/tomar correlativo',
  })
  @IsOptional()
  @IsUUID()
  serieDocumentoId?: string;

  @ApiPropertyOptional({
    description: 'Observaciones fiscales visibles en el comprobante',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  // Doc 10 §7/§8 — el frontend muestra el modal de advertencias y, si el usuario
  // confirma, reenvía la emisión con `confirmarAdvertencias: true`. El backend
  // ignora advertencias en ese caso, pero NUNCA ignora bloqueantes.
  @ApiPropertyOptional({
    description:
      'Si true, el backend ignora las advertencias de ValidacionFiscalService.',
  })
  @IsOptional()
  @IsBoolean()
  confirmarAdvertencias?: boolean;
}
