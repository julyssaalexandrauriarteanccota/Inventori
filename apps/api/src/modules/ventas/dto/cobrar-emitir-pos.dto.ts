import { IntersectionType } from '@nestjs/swagger';
import { ConfirmarVentaDto } from './confirmar-venta.dto';
import { CreateVentaDto } from './create-venta.dto';

export class CobrarEmitirPosDto extends IntersectionType(
  CreateVentaDto,
  ConfirmarVentaDto,
) {}
