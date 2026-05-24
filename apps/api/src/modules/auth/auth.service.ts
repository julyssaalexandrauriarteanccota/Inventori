import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  PASSWORD_POLICY_MESSAGE,
  RolUsuario,
  isSecurePassword,
} from '@erp/shared';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { JwtPayload } from '../../common/types';
import { PrismaService } from '../../database/prisma.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto, RegisterDto, UpdateOwnProfileDto } from './dto';
import { EmailService } from './email.service';
import {
  buildEmailVerificationOtpEmail,
  buildPasswordResetLinkEmail,
} from './email-templates';

const SALT_ROUNDS = 10;
const PASSWORD_RESET_EXPIRES_IN = '15m';
const PASSWORD_RESET_EXPIRES_IN_MINUTES = 15;
const PASSWORD_RESET_PURPOSE = 'password-reset';

const EMAIL_OTP_EXPIRES_IN_MINUTES = 15;
const EMAIL_OTP_MAX_INTENTOS = 5;
const EMAIL_OTP_RESEND_COOLDOWN_MS = 60_000; // 1 min antes de poder reenviar

interface PasswordResetJwtPayload {
  sub: string;
  email: string;
  purpose?: string;
  jti?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usuariosService: UsuariosService,
    private readonly emailService: EmailService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    const passwordValid = await bcrypt.compare(dto.password, usuario.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    const tokens = await this.generateTokens(
      usuario.id,
      usuario.email,
      usuario.rol,
    );

    this.logger.log(`Login exitoso: ${usuario.email}`);

    return {
      ...tokens,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        mustChangePassword: usuario.mustChangePassword,
        telefono: usuario.telefono,
        celular: usuario.celular,
        whatsapp: usuario.whatsapp,
        direccion: usuario.direccion,
        cargo: usuario.cargo,
        bio: usuario.bio,
        avatarUrl: usuario.avatarUrl,
      },
    };
  }

  async register(dto: RegisterDto) {
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
        nombre: dto.nombre,
        apellido: dto.apellido,
        email: dto.email,
        password: hashedPassword,
        rol: RolUsuario.TECNICO,
        activo: false,
        mustChangePassword: true,
        emailVerificado: false,
      },
    });

    // Genera y envía OTP de verificación. Si SMTP falla, el usuario ya
    // existe pero puede pedir reenvío después.
    await this.createAndSendEmailOtp(usuario.id, usuario.email, usuario.nombre);

    this.logger.log(`Solicitud de acceso creada: ${dto.email}`);

    return {
      message:
        'Te enviamos un código de 6 dígitos a tu correo para confirmar tu email. Tras la verificación, un administrador deberá activar tu cuenta.',
      requiresEmailVerification: true,
      email: dto.email,
    };
  }

  /**
   * Genera un OTP de 6 dígitos, invalida los previos del mismo usuario,
   * persiste el hash y dispara el email. NO devuelve el código por seguridad.
   */
  private async createAndSendEmailOtp(
    usuarioId: string,
    email: string,
    nombre: string,
  ) {
    // Invalidar OTPs previos no usados
    await this.prisma.emailVerificationOtp.updateMany({
      where: { usuarioId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const codigo = this.generateNumericCode(6);
    const codeHash = await bcrypt.hash(codigo, SALT_ROUNDS);
    const expiresAt = new Date(
      Date.now() + EMAIL_OTP_EXPIRES_IN_MINUTES * 60 * 1000,
    );

    await this.prisma.emailVerificationOtp.create({
      data: { usuarioId, codeHash, expiresAt },
    });

    const brand = await this.emailService.getBrand();
    const template = buildEmailVerificationOtpEmail({
      nombre,
      codigo,
      vigenciaMinutos: EMAIL_OTP_EXPIRES_IN_MINUTES,
      brand,
    });
    await this.emailService.send(email, template);
  }

  private generateNumericCode(digits: number): string {
    let code = '';
    for (let i = 0; i < digits; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  async resendEmailOtp(email: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, email: true, nombre: true, emailVerificado: true },
    });
    // Respuesta genérica para no filtrar si el email existe.
    const genericMessage = {
      message:
        'Si el correo está registrado y pendiente de verificación, te enviamos un nuevo código.',
    };
    if (!usuario || usuario.emailVerificado) {
      return genericMessage;
    }

    // Cooldown: no permitir reenvío si el último OTP es muy reciente
    const ultimo = await this.prisma.emailVerificationOtp.findFirst({
      where: { usuarioId: usuario.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, usedAt: true },
    });
    if (
      ultimo &&
      !ultimo.usedAt &&
      Date.now() - ultimo.createdAt.getTime() < EMAIL_OTP_RESEND_COOLDOWN_MS
    ) {
      throw new BadRequestException(
        'Espera al menos 1 minuto antes de pedir un nuevo código.',
      );
    }

    await this.createAndSendEmailOtp(usuario.id, usuario.email, usuario.nombre);
    return genericMessage;
  }

  async verifyEmailOtp(email: string, codigo: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, emailVerificado: true },
    });
    if (!usuario) {
      throw new BadRequestException('Código inválido o vencido');
    }
    if (usuario.emailVerificado) {
      return {
        message: 'Tu correo ya estaba verificado. Espera la activación.',
        alreadyVerified: true,
      };
    }

    const otp = await this.prisma.emailVerificationOtp.findFirst({
      where: { usuarioId: usuario.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new BadRequestException(
        'No hay códigos pendientes. Pide un nuevo código.',
      );
    }
    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('El código venció. Pide un nuevo código.');
    }
    if (otp.intentos >= EMAIL_OTP_MAX_INTENTOS) {
      // Invalidar y forzar reenvío
      await this.prisma.emailVerificationOtp.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });
      throw new BadRequestException(
        'Demasiados intentos fallidos. Pide un nuevo código.',
      );
    }

    const valido = await bcrypt.compare(codigo, otp.codeHash);
    if (!valido) {
      await this.prisma.emailVerificationOtp.update({
        where: { id: otp.id },
        data: { intentos: { increment: 1 } },
      });
      throw new BadRequestException('Código incorrecto. Intenta de nuevo.');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationOtp.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { emailVerificado: true, emailVerificadoAt: new Date() },
      }),
    ]);

    this.logger.log(`Email verificado: ${email}`);
    return {
      message:
        'Correo verificado. Un administrador revisará tu solicitud y te avisaremos cuando puedas ingresar.',
      alreadyVerified: false,
    };
  }

  async forgotPassword(email: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        nombre: true,
        email: true,
        activo: true,
      },
    });

    const message =
      'Si el correo existe, te enviaremos instrucciones para restablecer tu contrasena.';

    if (!usuario || !usuario.activo) {
      return { message };
    }

    const tokenId = randomBytes(32).toString('hex');
    const resetToken = this.jwtService.sign(
      {
        sub: usuario.id,
        email: usuario.email,
        purpose: PASSWORD_RESET_PURPOSE,
        jti: tokenId,
      },
      {
        secret: this.getPasswordResetSecret(),
        expiresIn: PASSWORD_RESET_EXPIRES_IN,
      },
    );

    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_EXPIRES_IN_MINUTES * 60 * 1000,
    );

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { usuarioId: usuario.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: this.hashPasswordResetToken(tokenId),
          expiresAt,
        },
      }),
    ]);

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

    await this.sendPasswordResetEmail(usuario.email, usuario.nombre, resetUrl);

    const isDevelopment =
      this.configService.get<string>('NODE_ENV', 'development') !==
      'production';
    return isDevelopment ? { message, resetUrl } : { message };
  }

  async resetPassword(token: string, password: string) {
    try {
      this.ensureSecurePassword(password);
      const payload = this.verifyPasswordResetPayload(token);
      const tokenRecord = await this.findUsablePasswordResetToken(payload);
      const usedAt = new Date();

      const consumed = await this.prisma.passwordResetToken.updateMany({
        where: {
          id: tokenRecord.id,
          usedAt: null,
          expiresAt: { gt: usedAt },
        },
        data: { usedAt },
      });

      if (consumed.count !== 1) {
        throw new BadRequestException('Token vencido, invalido o ya utilizado');
      }

      await this.usuariosService.changePassword(tokenRecord.usuarioId, {
        password,
      });

      await this.prisma.passwordResetToken.updateMany({
        where: { usuarioId: tokenRecord.usuarioId, usedAt: null },
        data: { usedAt },
      });

      return {
        message:
          'Contrasena actualizada correctamente. Ya puedes iniciar sesion.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Token vencido o invalido');
    }
  }

  async validateResetPasswordToken(token: string) {
    const payload = this.verifyPasswordResetPayload(token);
    const tokenRecord = await this.findUsablePasswordResetToken(payload);

    return {
      valid: true,
      expiresAt: tokenRecord.expiresAt.toISOString(),
    };
  }

  async refresh(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
            rol: true,
            activo: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    if (!storedToken.usuario.activo || storedToken.usuario.deletedAt) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const tokens = await this.generateTokens(
      storedToken.usuario.id,
      storedToken.usuario.email,
      storedToken.usuario.rol,
    );

    this.logger.log(`Token refreshed: ${storedToken.usuario.email}`);

    return tokens;
  }

  async logout(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { token: refreshToken, revoked: false },
    });

    if (storedToken) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
      });
    }
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId: userId, revoked: false },
      data: { revoked: true },
    });
    this.logger.log(`All tokens revoked for user: ${userId}`);
  }

  async getProfile(userId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
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
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return usuario;
  }

  async updateOwnProfile(userId: string, dto: UpdateOwnProfileDto) {
    await this.getProfile(userId);

    const optionalFields: Array<keyof UpdateOwnProfileDto> = [
      'telefono',
      'celular',
      'whatsapp',
      'cargo',
      'direccion',
      'bio',
      'avatarUrl',
    ];
    const data: Record<string, string | null> = {};

    optionalFields.forEach((field) => {
      if (dto[field] !== undefined) {
        const value = dto[field]?.trim();
        data[field] = value ? value : null;
      }
    });

    await this.prisma.usuario.update({
      where: { id: userId },
      data,
    });

    return this.getProfile(userId);
  }

  async changeOwnPassword(userId: string, password: string) {
    await this.usuariosService.changePassword(userId, { password });
    this.logger.log(`Usuario ${userId} cambio su propia contrasena`);
    return { message: 'Contrasena actualizada correctamente.' };
  }

  private async generateTokens(userId: string, email: string, rol: string) {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      email,
      rol: rol as JwtPayload['rol'],
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshTokenValue = randomBytes(64).toString('hex');
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '30d',
    );
    const expiresAt = this.calculateExpiry(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        usuarioId: userId,
        token: refreshTokenValue,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  private calculateExpiry(duration: string): Date {
    const now = new Date();
    const match = duration.match(/^(\d+)([dhms])$/);
    if (!match) {
      now.setDate(now.getDate() + 30);
      return now;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        now.setDate(now.getDate() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
      case 's':
        now.setSeconds(now.getSeconds() + value);
        break;
    }

    return now;
  }

  private getPasswordResetSecret() {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      this.configService.getOrThrow<string>('JWT_SECRET')
    );
  }

  private hashPasswordResetToken(tokenId: string) {
    return createHash('sha256').update(tokenId).digest('hex');
  }

  private ensureSecurePassword(password: string) {
    if (!isSecurePassword(password)) {
      throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
    }
  }

  private verifyPasswordResetPayload(token: string) {
    try {
      const payload = this.jwtService.verify<PasswordResetJwtPayload>(token, {
        secret: this.getPasswordResetSecret(),
      });

      if (payload.purpose !== PASSWORD_RESET_PURPOSE || !payload.jti) {
        throw new BadRequestException('Token de restablecimiento invalido');
      }

      return payload;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Token vencido o invalido');
    }
  }

  private async findUsablePasswordResetToken(payload: PasswordResetJwtPayload) {
    if (!payload.jti) {
      throw new BadRequestException('Token de restablecimiento invalido');
    }

    const tokenRecord = await this.prisma.passwordResetToken.findFirst({
      where: {
        usuarioId: payload.sub,
        tokenHash: this.hashPasswordResetToken(payload.jti),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        usuarioId: true,
        expiresAt: true,
        usuario: {
          select: {
            activo: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      !tokenRecord ||
      !tokenRecord.usuario.activo ||
      tokenRecord.usuario.deletedAt
    ) {
      throw new BadRequestException('Token vencido, invalido o ya utilizado');
    }

    return tokenRecord;
  }

  private async sendPasswordResetEmail(
    email: string,
    nombre: string,
    resetUrl: string,
  ) {
    const brand = await this.emailService.getBrand();
    const template = buildPasswordResetLinkEmail({
      nombre,
      resetUrl,
      vigenciaMinutos: PASSWORD_RESET_EXPIRES_IN_MINUTES,
      brand,
    });
    await this.emailService.send(email, template);
  }
}
