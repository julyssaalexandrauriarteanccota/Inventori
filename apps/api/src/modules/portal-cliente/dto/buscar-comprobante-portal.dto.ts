import { ApiProperty } from '@nestjs/swagger';
import { TipoDocumento } from '@erp/shared';
import { IsEnum, IsString, Matches } from 'class-validator';

export class BuscarComprobantePortalDto {
  @ApiProperty({ example: '20123456789' })
  @IsString()
  @Matches(/^\d{11}$/, { message: 'El RUC emisor debe tener 11 dígitos' })
  rucEmisor!: string;

  @ApiProperty({ enum: TipoDocumento, example: TipoDocumento.FACTURA })
  @IsEnum(TipoDocumento)
  tipo!: TipoDocumento;

  @ApiProperty({ example: 'F001' })
  @IsString()
  @Matches(/^[A-Z0-9]{4}$/, { message: 'La serie debe tener 4 caracteres' })
  serie!: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @Matches(/^\d{1,8}$/, {
    message: 'El correlativo debe tener entre 1 y 8 dígitos',
  })
  correlativo!: string;

  @ApiProperty({ example: 'RUC' })
  @IsString()
  clienteDocTipo!: string;

  @ApiProperty({ example: '20987654321' })
  @IsString()
  @Matches(/^[A-Za-z0-9-]{6,15}$/, {
    message: 'El documento del receptor no tiene un formato válido',
  })
  clienteDocNum!: string;
}
