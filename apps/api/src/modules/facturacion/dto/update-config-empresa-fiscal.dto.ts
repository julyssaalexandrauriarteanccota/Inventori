import { PartialType } from '@nestjs/swagger';
import { CreateConfigEmpresaFiscalDto } from './create-config-empresa-fiscal.dto';

export class UpdateConfigEmpresaFiscalDto extends PartialType(
  CreateConfigEmpresaFiscalDto,
) {}
