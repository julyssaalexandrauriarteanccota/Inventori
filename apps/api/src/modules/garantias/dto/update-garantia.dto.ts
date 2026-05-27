import { PartialType } from '@nestjs/swagger';
import { CreateGarantiaDto } from './create-garantia.dto';

export class UpdateGarantiaDto extends PartialType(CreateGarantiaDto) {}
