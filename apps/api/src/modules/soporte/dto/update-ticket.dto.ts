import { PartialType } from '@nestjs/swagger';
import { CreateTicketDto } from './create-ticket.dto';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoTicket } from '@erp/shared';

export class UpdateTicketDto extends PartialType(CreateTicketDto) {
  @ApiPropertyOptional({ enum: EstadoTicket })
  @IsOptional()
  @IsEnum(EstadoTicket)
  estado?: EstadoTicket;

  @ApiPropertyOptional({ description: 'Diagnóstico del técnico' })
  @IsOptional()
  @IsString()
  diagnostico?: string;

  @ApiPropertyOptional({ description: 'Solución aplicada' })
  @IsOptional()
  @IsString()
  solucion?: string;
}
