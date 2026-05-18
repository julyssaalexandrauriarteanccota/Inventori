import { ApiProperty } from '@nestjs/swagger';
import { AddDetalleTicketDto } from './add-detalle-ticket.dto';

export class AddRepuestoDto extends AddDetalleTicketDto {
  @ApiProperty({ description: 'ID del producto (repuesto)' })
  declare productoId: string;
}
