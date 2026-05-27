import { PartialType } from '@nestjs/swagger';
import { CreateContratoAlquilerDto } from './create-contrato-alquiler.dto';

export class UpdateContratoAlquilerDto extends PartialType(
  CreateContratoAlquilerDto,
) {}
