import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactoClienteDto {
  @ApiProperty({
    description: 'Tipo de interacción: LLAMADA, EMAIL, VISITA, NOTA',
  })
  @IsString()
  @IsNotEmpty()
  tipo: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  usuarioId?: string;
}
