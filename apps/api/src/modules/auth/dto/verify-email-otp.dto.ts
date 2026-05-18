import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class VerifyEmailOtpDto {
  @ApiProperty({ example: 'juan@erp.local' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6 dígitos numéricos enviados al correo.',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos numéricos' })
  codigo: string;
}

export class ResendEmailOtpDto {
  @ApiProperty({ example: 'juan@erp.local' })
  @IsEmail()
  email: string;
}
