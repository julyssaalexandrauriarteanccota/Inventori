import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

/**
 * Doc 04 / Doc 08 — Propósitos para consultar elegibilidad de un comprobante
 * origen como referencia de una operación derivada.
 *
 *  - `nc`   → Emitir nota de crédito (regular o excepcional).
 *  - `nd`   → Emitir nota de débito.
 *  - `baja` → Comunicar baja (RA) ante SUNAT.
 */
export enum PropositoElegibilidad {
  NC = 'nc',
  ND = 'nd',
  BAJA = 'baja',
}

export class QueryElegibilidadComprobanteDto {
  @ApiProperty({
    enum: PropositoElegibilidad,
    description:
      'Propósito de la elegibilidad: nc (nota de crédito), nd (nota de débito), baja (comunicación de baja).',
    example: PropositoElegibilidad.NC,
  })
  @IsEnum(PropositoElegibilidad, {
    message: 'proposito debe ser uno de: nc, nd, baja',
  })
  proposito!: PropositoElegibilidad;
}
