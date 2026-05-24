import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConsultaDocumentoClienteDto {
  @ApiProperty({ enum: ['DNI', 'RUC'] })
  @IsIn(['DNI', 'RUC'])
  tipoDocumento!: 'DNI' | 'RUC';

  @ApiProperty({ example: '20123456789' })
  @IsString()
  @IsNotEmpty()
  numeroDocumento!: string;

  @ApiPropertyOptional({
    enum: ['AUTO', 'LOCAL_ONLY', 'EXTERNAL_ONLY'],
    default: 'AUTO',
    description:
      'AUTO usa padrón local y luego proveedores externos. LOCAL_ONLY no consume APIs. EXTERNAL_ONLY consume proveedores externos.',
  })
  @IsOptional()
  @IsIn(['AUTO', 'LOCAL_ONLY', 'EXTERNAL_ONLY'])
  modo?: 'AUTO' | 'LOCAL_ONLY' | 'EXTERNAL_ONLY';
}
