import {
  BadRequestException,
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import {
  PASSWORD_POLICY_MESSAGE,
  RolUsuario,
  isSecurePassword,
} from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../auth/email.service';
import { buildAccountActivatedEmail } from '../auth/email-templates';
import { WhatsappService } from '../notifications/whatsapp.service';
import {
  CreateUsuarioDto,
  UpdateUsuarioDto,
  QueryUsuarioDto,
  ChangePasswordDto,
} from './dto';

const ROL_LABELS: Record<RolUsuario, string> = {
  [RolUsuario.ADMIN]: 'Administrador',
  [RolUsuario.ENCARGADO]: 'Encargado',
  [RolUsuario.TECNICO]: 'Técnico',
};

const SALT_ROUNDS = 10;

const SELECT_USUARIO = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  rol: true,
  activo: true,
  mustChangePassword: true,
  ultimoAcceso: true,
  telefono: true,
  celular: true,
  whatsapp: true,
  direccion: true,
  cargo: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsappService,
  ) {}

  private async notifyWhatsapp(
    whatsapp: string | null | undefined,
    message: string,
  ): Promise<void> {
    if (
      this.configService.get<string>('AUTH_NOTIFICATIONS_VIA_WHATSAPP') !==
      'true'
    )
      return;
    if (!this.whatsappService.isConfigured() || !whatsapp) return;
    try {
      const result = await this.whatsappService.sendText({
        to: whatsapp,
        text: message,
      });
      if (!result.delivered) {
        this.logger.warn(
          `WhatsApp bienvenida omitido (${
            result.reason ?? 'unknown'
          }): ${result.errorMessage ?? ''}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Error enviando WhatsApp de bienvenida: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Activa una cuenta previamente registrada y verificada por email.
   * Reglas:
   *  - El usuario debe existir y NO estar borrado.
   *  - Su email debe estar verificado (`emailVerificado = true`).
   *  - Si ya está activo, retorna sin enviar correo (idempotente).
   *
   * Envía correo de bienvenida con link al login. Si SMTP falla, la
   * activación se aplica igual y se registra warn en logs.
   */
  async activar(id: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        emailVerificado: true,
      },
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    if (!usuario.emailVerificado) {
      throw new BadRequestException(
        'El usuario aún no ha verificado su correo. No se puede activar hasta entonces.',
      );
    }
    if (usuario.activo) {
      return { id: usuario.id, message: 'La cuenta ya estaba activa.' };
    }

    const updated = await this.prisma.usuario.update({
      where: { id },
      data: { activo: true },
      select: { whatsapp: true },
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const loginUrl = `${frontendUrl.replace(/\/$/, '')}/auth/login`;

    const brand = await this.emailService.getBrand();
    const template = buildAccountActivatedEmail({
      nombre: usuario.nombre,
      loginUrl,
      rolLabel: ROL_LABELS[usuario.rol as RolUsuario] ?? String(usuario.rol),
      brand,
    });
    await this.emailService.send(usuario.email, template);
    await this.notifyWhatsapp(
      updated.whatsapp,
      `Hola ${usuario.nombre}, tu cuenta en ${brand.nombre} fue activada. Ingresa aquí: ${loginUrl}`,
    );

    this.logger.log(`Cuenta activada y bienvenida enviada: ${usuario.email}`);
    return {
      id: usuario.id,
      message: 'Cuenta activada y correo de bienvenida enviado.',
    };
  }

  async desactivar(id: string) {
    const usuario = await this.findOne(id);
    if (!usuario.activo) {
      return { id, message: 'La cuenta ya estaba desactivada.' };
    }
    await this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });
    // Eliminar refresh tokens para forzar logout de todas las sesiones
    await this.prisma.refreshToken.deleteMany({
      where: { usuarioId: id },
    });
    this.logger.log(`Cuenta desactivada: ${usuario.email}`);
    return { id, message: 'Cuenta desactivada.' };
  }

  async create(dto: CreateUsuarioDto) {
    const existing = await this.prisma.usuario.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('Ya existe un usuario con este email');
    }

    this.ensureSecurePassword(dto.password);

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const usuario = await this.prisma.usuario.create({
      data: {
        ...dto,
        password: hashedPassword,
      },
      select: SELECT_USUARIO,
    });

    this.logger.log(`Usuario creado: ${usuario.email}`);
    return usuario;
  }

  async findAll(query: QueryUsuarioDto) {
    const { page = 1, limit = 20, search, rol } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (rol) {
      where.rol = rol;
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { apellido: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [usuarios, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        select: SELECT_USUARIO,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return {
      data: usuarios,
      meta: {
        total,
        page,
        limit,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, deletedAt: null },
      select: SELECT_USUARIO,
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }

    return usuario;
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    await this.findOne(id); // Verifica existencia

    if (dto.email) {
      const existing = await this.prisma.usuario.findFirst({
        where: { email: dto.email, deletedAt: null, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un usuario con este email');
      }
    }

    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: dto,
      select: SELECT_USUARIO,
    });

    this.logger.log(`Usuario actualizado: ${usuario.email}`);
    return usuario;
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    await this.findOne(id); // Verifica existencia

    this.ensureSecurePassword(dto.password);

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    await this.prisma.usuario.update({
      where: { id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    });

    // Eliminar todos los refresh tokens del usuario
    await this.prisma.refreshToken.deleteMany({
      where: { usuarioId: id },
    });

    this.logger.log(`Password cambiada para usuario: ${id}`);
  }

  async remove(id: string) {
    await this.findOne(id); // Verifica existencia

    await this.prisma.usuario.update({
      where: { id },
      data: { deletedAt: new Date(), activo: false },
    });

    // Eliminar todos los refresh tokens
    await this.prisma.refreshToken.deleteMany({
      where: { usuarioId: id },
    });

    this.logger.log(`Usuario eliminado (soft delete): ${id}`);
  }

  private ensureSecurePassword(password: string) {
    if (!isSecurePassword(password)) {
      throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
    }
  }
}
