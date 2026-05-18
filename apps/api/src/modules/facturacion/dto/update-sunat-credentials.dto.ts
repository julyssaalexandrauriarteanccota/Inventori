import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSunatCredentialsDto {
  @ApiPropertyOptional({
    description:
      'Usuario SOL completo, normalmente RUC + usuario secundario. No se expone después de guardar.',
    example: '20123456789MODDATOS',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  solUsername?: string;

  @ApiPropertyOptional({
    description:
      'Usuario SOL sin RUC. El backend construye RUC + usuario usando el RUC fiscal configurado.',
    example: 'MODDATOS',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  solUser?: string;

  @ApiProperty({
    description:
      'Contraseña SOL. Viaja transitoriamente al backend y se guarda cifrada/referenciada.',
    writeOnly: true,
  })
  @IsString()
  @MinLength(1)
  password!: string;
}
