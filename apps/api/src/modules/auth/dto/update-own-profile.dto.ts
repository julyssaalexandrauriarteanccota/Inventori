import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOwnProfileDto {
  @ApiPropertyOptional({ example: '+51 999 888 777' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @ApiPropertyOptional({ example: '+51 999 888 777' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  celular?: string;

  @ApiPropertyOptional({ example: '+51 999 888 777' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'Jefe de soporte' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cargo?: string;

  @ApiPropertyOptional({ example: 'Av. Principal 123' })
  @IsOptional()
  @IsString()
  @MaxLength(220)
  direccion?: string;

  @ApiPropertyOptional({ example: 'Especialista en soporte técnico.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: '/uploads/public/avatar.webp' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}
