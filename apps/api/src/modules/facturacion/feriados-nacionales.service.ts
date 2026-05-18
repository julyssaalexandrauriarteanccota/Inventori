import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateFeriadoNacionalDto,
  QueryFeriadoNacionalDto,
  UpdateFeriadoNacionalDto,
} from './dto';

@Injectable()
export class FeriadosNacionalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryFeriadoNacionalDto) {
    const anio = query.anio ?? new Date().getFullYear();
    return this.prisma.feriadoNacional.findMany({
      where: { anio },
      orderBy: { fecha: 'asc' },
    });
  }

  async create(dto: CreateFeriadoNacionalDto) {
    const data = this.normalize(dto);
    const existing = await this.prisma.feriadoNacional.findUnique({
      where: { fecha: data.fecha },
    });
    if (existing) {
      throw new ConflictException('Ya existe un feriado para esa fecha');
    }

    return this.prisma.feriadoNacional.create({ data });
  }

  async update(id: string, dto: UpdateFeriadoNacionalDto) {
    const current = await this.prisma.feriadoNacional.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException(`Feriado ${id} no encontrado`);
    }

    const data = this.normalize(dto, current);
    return this.prisma.feriadoNacional.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const current = await this.prisma.feriadoNacional.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException(`Feriado ${id} no encontrado`);
    }

    await this.prisma.feriadoNacional.delete({ where: { id } });
    return current;
  }

  private normalize(
    dto: CreateFeriadoNacionalDto | UpdateFeriadoNacionalDto,
    current?: { fecha: Date; nombre: string; esNoLaborable: boolean },
  ) {
    const fecha = dto.fecha ? parseDateOnly(dto.fecha) : current?.fecha;
    if (!fecha) {
      throw new BadRequestException('Debe indicar la fecha del feriado');
    }

    const nombre =
      typeof dto.nombre === 'string' ? dto.nombre.trim() : current?.nombre;
    if (!nombre) {
      throw new BadRequestException('Debe indicar el nombre del feriado');
    }

    return {
      fecha,
      nombre,
      anio: fecha.getUTCFullYear(),
      esNoLaborable: dto.esNoLaborable ?? current?.esNoLaborable ?? false,
    };
  }
}

function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('La fecha debe tener formato YYYY-MM-DD');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Fecha inválida');
  }
  return date;
}
