import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RolUsuario } from '@erp/shared';

export class ActivarUsuarioDto {
  @ApiProperty({
    enum: RolUsuario,
    example: RolUsuario.TECNICO,
    description: 'Rol a asignar al activar la cuenta',
  })
  @IsEnum(RolUsuario)
  @IsNotEmpty()
  rol!: RolUsuario;
}
