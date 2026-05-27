import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReactivarEquipoDto {
  @ApiProperty({
    description: 'Almacén interno al que vuelve físicamente el equipo',
  })
  @IsUUID()
  almacenId: string;
}
