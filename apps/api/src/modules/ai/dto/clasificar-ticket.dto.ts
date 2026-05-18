import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ClasificarTicketDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsOptional()
  fallaReportada?: string;
}
