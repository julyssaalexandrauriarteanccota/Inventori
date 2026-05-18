import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UploadCertificadoDigitalDto {
  @ApiProperty({ example: 'Certificado principal' })
  @IsString()
  nombre!: string;

  @ApiProperty({
    description:
      'Contraseña del .p12. Se usa solo en backend y se guarda cifrada/referenciada.',
    writeOnly: true,
  })
  @IsString()
  @MinLength(1)
  password!: string;
}
