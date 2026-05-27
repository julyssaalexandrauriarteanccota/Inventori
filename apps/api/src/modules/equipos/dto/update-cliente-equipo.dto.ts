import { PartialType } from '@nestjs/swagger';
import { CreateClienteEquipoDto } from './create-cliente-equipo.dto';

export class UpdateClienteEquipoDto extends PartialType(
  CreateClienteEquipoDto,
) {}
