import { PartialType } from '@nestjs/swagger';
import { CreateEmpresaSedeFiscalDto } from './create-empresa-sede-fiscal.dto';

export class UpdateEmpresaSedeFiscalDto extends PartialType(
  CreateEmpresaSedeFiscalDto,
) {}
