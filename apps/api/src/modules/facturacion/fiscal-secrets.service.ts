import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';

const ALGORITHM = 'aes-256-gcm';
const DEFAULT_KEY_VERSION = 'v1';

export interface EncryptedPayload {
  algorithm: 'AES-256-GCM';
  keyVersion: string;
  iv: string;
  authTag: string;
  encryptedValue: string;
}

@Injectable()
export class FiscalSecretsService {
  constructor(private readonly prisma: PrismaService) {}

  encryptBuffer(value: Buffer): EncryptedPayload {
    const key = this.getMasterKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      algorithm: 'AES-256-GCM',
      keyVersion: process.env.FISCAL_MASTER_KEY_VERSION || DEFAULT_KEY_VERSION,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      encryptedValue: encrypted.toString('base64'),
    };
  }

  decryptBuffer(payload: EncryptedPayload): Buffer {
    if (payload.algorithm !== 'AES-256-GCM') {
      throw new InternalServerErrorException(
        'Algoritmo de secreto fiscal no soportado',
      );
    }

    const key = this.getMasterKey();
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(payload.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(payload.encryptedValue, 'base64')),
      decipher.final(),
    ]);
  }

  async upsertSecret(scope: string, name: string, plainValue: string) {
    const payload = this.encryptBuffer(Buffer.from(plainValue, 'utf8'));

    return this.prisma.fiscalSecret.upsert({
      where: { scope_name: { scope, name } },
      create: {
        scope,
        name,
        encryptedValue: payload.encryptedValue,
        iv: payload.iv,
        authTag: payload.authTag,
        algorithm: payload.algorithm,
        keyVersion: payload.keyVersion,
        rotatedAt: new Date(),
      },
      update: {
        encryptedValue: payload.encryptedValue,
        iv: payload.iv,
        authTag: payload.authTag,
        algorithm: payload.algorithm,
        keyVersion: payload.keyVersion,
        rotatedAt: new Date(),
        deletedAt: null,
      },
    });
  }

  async deleteSecret(scope: string, name: string) {
    await this.prisma.fiscalSecret.updateMany({
      where: { scope, name, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async revealSecret(scope: string, name: string) {
    const secret = await this.prisma.fiscalSecret.findFirst({
      where: { scope, name, deletedAt: null },
    });
    if (!secret) {
      throw new NotFoundException('Secreto fiscal no encontrado');
    }

    return this.decryptBuffer({
      algorithm: 'AES-256-GCM',
      keyVersion: secret.keyVersion,
      iv: secret.iv,
      authTag: secret.authTag,
      encryptedValue: secret.encryptedValue,
    }).toString('utf8');
  }

  private getMasterKey() {
    const encoded = process.env.FISCAL_MASTER_KEY_BASE64;
    if (!encoded) {
      throw new InternalServerErrorException(
        'FISCAL_MASTER_KEY_BASE64 no está configurado en backend',
      );
    }

    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32) {
      throw new InternalServerErrorException(
        'FISCAL_MASTER_KEY_BASE64 debe decodificar exactamente 32 bytes',
      );
    }

    return key;
  }
}
