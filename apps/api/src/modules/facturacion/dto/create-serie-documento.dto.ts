import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AmbienteSunat, TipoDocumento } from '@erp/shared';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateSerieDocumentoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  configEmpresaFiscalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sedeFiscalId?: string;

  @ApiProperty({ enum: TipoDocumento })
  @IsEnum(TipoDocumento)
  tipo!: TipoDocumento;

  @ApiProperty({ example: 'F001' })
  @IsString()
  @Matches(/^[A-Z0-9]{4}$/, {
    message: 'La serie debe tener 4 caracteres alfanuméricos',
  })
  serie!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  correlativoActual?: number;

  @ApiPropertyOptional({ default: '0000' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'El código de establecimiento debe tener 4 dígitos',
  })
  codigoEstablecimiento?: string;

  @ApiPropertyOptional({ enum: AmbienteSunat, default: AmbienteSunat.BETA })
  @IsOptional()
  @IsEnum(AmbienteSunat)
  ambiente?: AmbienteSunat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
