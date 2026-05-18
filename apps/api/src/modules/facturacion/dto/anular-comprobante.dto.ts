import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AnularComprobanteDto {
  @ApiProperty({
    description:
      'Motivo de la baja SUNAT (Doc 04 §5.1). Se incluye en VoidReasonDescription del RA. Obligatorio, mínimo 10 caracteres.',
    minLength: 10,
    maxLength: 200,
    example: 'Error en datos del cliente solicitada por contabilidad',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  motivo!: string;
}
