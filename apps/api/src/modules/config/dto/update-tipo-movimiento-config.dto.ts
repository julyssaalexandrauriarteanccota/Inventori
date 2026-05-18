import { PartialType } from '@nestjs/swagger';
import { CreateTipoMovimientoConfigDto } from './create-tipo-movimiento-config.dto';

export class UpdateTipoMovimientoConfigDto extends PartialType(
  CreateTipoMovimientoConfigDto,
) {}
