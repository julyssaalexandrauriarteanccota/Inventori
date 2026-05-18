import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@erp.local' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
