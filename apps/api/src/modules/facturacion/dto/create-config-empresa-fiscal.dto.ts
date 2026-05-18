import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AmbienteSunat,
  ModalidadEnvioBoletas,
  type ReglasValidacionConfig,
} from '@erp/shared';
import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  IsEmail,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

@ValidatorConstraint({ name: 'isSunatRuc', async: false })
class IsSunatRucConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (typeof value !== 'string') return false;
    if (!/^(10|15|17|20)\d{9}$/.test(value)) return false;

    const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const sum = factors.reduce(
      (total, factor, index) => total + Number(value[index]) * factor,
      0,
    );
    const remainder = sum % 11;
    const check = remainder < 2 ? remainder : 11 - remainder;
    return check === Number(value[10]);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} debe ser un RUC SUNAT válido de 11 dígitos`;
  }
}

function IsSunatRuc(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSunatRucConstraint,
    });
  };
}

export class CreateConfigEmpresaFiscalDto {
  @ApiProperty({ example: '20123456789' })
  @IsString()
  @IsSunatRuc()
  ruc!: string;

  @ApiProperty({ example: 'Empresa Demo SAC' })
  @IsString()
  razonSocial!: string;

  @ApiPropertyOptional({ example: 'Empresa Demo' })
  @IsOptional()
  @IsString()
  nombreComercial?: string;

  @ApiProperty({ example: 'Av. Fiscal 123' })
  @IsString()
  direccionFiscal!: string;

  @ApiPropertyOptional({ example: '150101' })
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'El ubigeo fiscal debe tener 6 dígitos' })
  ubigeoFiscal?: string;

  @ApiPropertyOptional({ example: '0000' })
  @IsOptional()
  @Matches(/^\d{4}$/, {
    message: 'El código de establecimiento debe tener 4 dígitos',
  })
  codigoEstablecimiento?: string;

  @ApiPropertyOptional({ example: 'facturacion@example.com' })
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsEmail()
  correoSee?: string;

  @ApiPropertyOptional({ example: 'MYPE Tributario' })
  @IsOptional()
  @IsString()
  regimenTributario?: string;

  @ApiPropertyOptional({ enum: ['A4', 'TICKET', 'AMBOS'] })
  @IsOptional()
  @IsIn(['A4', 'TICKET', 'AMBOS'])
  formatoImpresionDefault?: 'A4' | 'TICKET' | 'AMBOS';

  @ApiPropertyOptional({ example: 'Gracias por su compra' })
  @IsOptional()
  @IsString()
  pieImpresion?: string;

  @ApiPropertyOptional({ enum: AmbienteSunat, default: AmbienteSunat.BETA })
  @IsOptional()
  @IsEnum(AmbienteSunat)
  ambienteDefault?: AmbienteSunat;

  @ApiPropertyOptional({
    enum: ModalidadEnvioBoletas,
    default: ModalidadEnvioBoletas.INDIVIDUAL,
  })
  @IsOptional()
  @IsEnum(ModalidadEnvioBoletas)
  modalidadEnvioBoletas?: ModalidadEnvioBoletas;

  // Doc 10 §6 — overrides parciales de las reglas configurables.
  // Validación de claves y valores se hace en el servicio para mantener
  // la fuente de verdad en @erp/shared (REGLAS_CONFIGURABLES_DEFAULTS).
  @ApiPropertyOptional({
    description:
      'Override parcial de niveles para reglas configurables. Claves de @erp/shared.ReglaConfigurableId y valores BLOQUEANTE|ADVERTENCIA.',
    example: { ruc_receptor_activo_sunat: 'BLOQUEANTE' },
  })
  @IsOptional()
  @IsObject()
  reglasValidacion?: ReglasValidacionConfig;
}
