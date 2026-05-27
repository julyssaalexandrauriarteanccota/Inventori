import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX,
  RolUsuario,
} from '@erp/shared';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  apellido!: string;

  @ApiProperty({ example: 'juan@erp.local' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Password123!', minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @IsNotEmpty()
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password!: string;

  @ApiProperty({ enum: RolUsuario, example: RolUsuario.TECNICO })
  @IsEnum(RolUsuario)
  @IsNotEmpty()
  rol!: RolUsuario;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiPropertyOptional({
    default: true,
    description:
      'Cuando el admin crea al usuario, por defecto se exige cambio de contraseña en el primer login.',
  })
  @IsBoolean()
  @IsOptional()
  mustChangePassword?: boolean;
}
