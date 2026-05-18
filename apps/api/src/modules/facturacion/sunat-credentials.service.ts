import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpdateSunatCredentialsDto } from './dto';
import { FiscalSecretsService } from './fiscal-secrets.service';

const SUNAT_CREDENTIALS_SCOPE = 'sunat-direct:sol-credentials';
const SECRET_SOL_USERNAME = 'sol-username';
const SECRET_SOL_USER = 'sol-user';
const SECRET_SOL_PASSWORD = 'sol-password';

export interface SunatCredentialsResolution {
  username: string;
  password: string;
  source: 'FISCAL_SECRET' | 'ENV';
  usernameMode: 'FULL_USERNAME' | 'RUC_PLUS_SOL_USER';
}

export interface SunatCredentialsSafeStatus {
  configured: boolean;
  source: 'FISCAL_SECRET' | 'ENV' | 'NONE';
  usernameConfigured: boolean;
  passwordConfigured: boolean;
  usernameMode: 'FULL_USERNAME' | 'RUC_PLUS_SOL_USER' | null;
  usernamePreview: string | null;
}

@Injectable()
export class SunatCredentialsService {
  constructor(
    private readonly fiscalSecrets: FiscalSecretsService,
    private readonly configService: ConfigService,
  ) {}

  async upsert(dto: UpdateSunatCredentialsDto) {
    const solUsername = dto.solUsername?.trim();
    const solUser = dto.solUser?.trim();
    const password = dto.password?.trim();

    if (!solUsername && !solUser) {
      throw new BadRequestException(
        'Debe configurar usuario SOL completo o usuario SOL sin RUC',
      );
    }
    if (solUsername && solUser) {
      throw new BadRequestException(
        'Configure solo un modo: usuario SOL completo o usuario SOL sin RUC',
      );
    }
    if (!password) {
      throw new BadRequestException('Debe configurar la contraseña SOL');
    }

    if (solUsername) {
      await this.fiscalSecrets.upsertSecret(
        SUNAT_CREDENTIALS_SCOPE,
        SECRET_SOL_USERNAME,
        solUsername,
      );
      await this.fiscalSecrets.deleteSecret(
        SUNAT_CREDENTIALS_SCOPE,
        SECRET_SOL_USER,
      );
    }

    if (solUser) {
      await this.fiscalSecrets.upsertSecret(
        SUNAT_CREDENTIALS_SCOPE,
        SECRET_SOL_USER,
        solUser,
      );
      await this.fiscalSecrets.deleteSecret(
        SUNAT_CREDENTIALS_SCOPE,
        SECRET_SOL_USERNAME,
      );
    }

    await this.fiscalSecrets.upsertSecret(
      SUNAT_CREDENTIALS_SCOPE,
      SECRET_SOL_PASSWORD,
      password,
    );

    return this.getSafeStatus();
  }

  async getSafeStatus(ruc?: string): Promise<SunatCredentialsSafeStatus> {
    const secretCredentials = await this.readSecretCredentials(false);
    if (secretCredentials.hasAny) {
      return {
        configured:
          (!!secretCredentials.solUsername || !!secretCredentials.solUser) &&
          !!secretCredentials.password,
        source: 'FISCAL_SECRET',
        usernameConfigured:
          !!secretCredentials.solUsername || !!secretCredentials.solUser,
        passwordConfigured: !!secretCredentials.password,
        usernameMode: secretCredentials.solUsername
          ? 'FULL_USERNAME'
          : secretCredentials.solUser
            ? 'RUC_PLUS_SOL_USER'
            : null,
        usernamePreview: this.previewUsername(
          secretCredentials.solUsername ||
            (secretCredentials.solUser && ruc
              ? `${ruc}${secretCredentials.solUser}`
              : secretCredentials.solUser) ||
            null,
        ),
      };
    }

    const envCredentials = this.readEnvCredentials(ruc || '');
    return {
      configured: !!envCredentials.username && !!envCredentials.password,
      source:
        envCredentials.username || envCredentials.password ? 'ENV' : 'NONE',
      usernameConfigured: !!envCredentials.username,
      passwordConfigured: !!envCredentials.password,
      usernameMode: envCredentials.usernameMode,
      usernamePreview: this.previewUsername(envCredentials.username ?? null),
    };
  }

  async resolveCredentials(ruc: string): Promise<SunatCredentialsResolution> {
    const secretCredentials = await this.readSecretCredentials(true);
    if (secretCredentials.hasAny) {
      if (
        (!secretCredentials.solUsername && !secretCredentials.solUser) ||
        !secretCredentials.password
      ) {
        throw new BadRequestException(
          'Credenciales SUNAT cifradas incompletas. Configure usuario y contraseña SOL desde Tributario.',
        );
      }

      return {
        username:
          secretCredentials.solUsername || `${ruc}${secretCredentials.solUser}`,
        password: secretCredentials.password,
        source: 'FISCAL_SECRET',
        usernameMode: secretCredentials.solUsername
          ? 'FULL_USERNAME'
          : 'RUC_PLUS_SOL_USER',
      };
    }

    const envCredentials = this.readEnvCredentials(ruc);
    if (!envCredentials.username || !envCredentials.password) {
      throw new BadRequestException(
        'Credenciales SUNAT no configuradas. Configure credenciales cifradas desde Tributario o SUNAT_SOL_USERNAME/SUNAT_SOL_PASSWORD o SUNAT_SOL_USER/SUNAT_SOL_PASSWORD en backend.',
      );
    }

    return {
      username: envCredentials.username,
      password: envCredentials.password,
      source: 'ENV',
      usernameMode: envCredentials.usernameMode ?? 'FULL_USERNAME',
    };
  }

  private async readSecretCredentials(_allowReveal: boolean) {
    const [solUsername, solUser, password] = await Promise.all([
      this.revealOptional(SECRET_SOL_USERNAME),
      this.revealOptional(SECRET_SOL_USER),
      this.revealOptional(SECRET_SOL_PASSWORD),
    ]);

    return {
      solUsername,
      solUser,
      password,
      hasAny: !!solUsername || !!solUser || !!password,
    };
  }

  private readEnvCredentials(ruc: string) {
    const fullUsername = this.configService.get<string>('SUNAT_SOL_USERNAME');
    const solUser = this.configService.get<string>('SUNAT_SOL_USER');
    const password = this.configService.get<string>('SUNAT_SOL_PASSWORD');
    const username = fullUsername || (solUser ? `${ruc}${solUser}` : undefined);

    return {
      username,
      password,
      usernameMode: fullUsername
        ? ('FULL_USERNAME' as const)
        : solUser
          ? ('RUC_PLUS_SOL_USER' as const)
          : null,
    };
  }

  private async revealOptional(name: string) {
    try {
      return await this.fiscalSecrets.revealSecret(
        SUNAT_CREDENTIALS_SCOPE,
        name,
      );
    } catch (error) {
      if (error instanceof NotFoundException) return null;
      throw error;
    }
  }

  private previewUsername(value: string | null) {
    if (!value) return null;
    if (value.length <= 4) return '****';
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }
}
