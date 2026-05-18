import { PartialType } from '@nestjs/swagger';
import { CreateClienteValidacionSunatDto } from './create-cliente-validacion-sunat.dto';

export class UpdateClienteValidacionSunatDto extends PartialType(
  CreateClienteValidacionSunatDto,
) {}
