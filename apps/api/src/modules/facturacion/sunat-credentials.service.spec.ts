import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FiscalSecretsService } from './fiscal-secrets.service';
import { SunatCredentialsService } from './sunat-credentials.service';

const mockFiscalSecrets = {
  upsertSecret: jest.fn(),
  deleteSecret: jest.fn(),
  revealSecret: jest.fn(),
} as unknown as FiscalSecretsService;

const mockConfig = {
  get: jest.fn(),
} as unknown as ConfigService;

describe('SunatCredentialsService', () => {
  let service: SunatCredentialsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SunatCredentialsService(mockFiscalSecrets, mockConfig);
  });

  function mockNoStoredSecrets() {
    (mockFiscalSecrets.revealSecret as jest.Mock).mockRejectedValue(
      new NotFoundException('missing'),
    );
  }

  it('guarda usuario SOL sin RUC y contraseña como secretos cifrados', async () => {
    (mockFiscalSecrets.upsertSecret as jest.Mock).mockResolvedValue({
      id: 's1',
    });
    (mockFiscalSecrets.deleteSecret as jest.Mock).mockResolvedValue(undefined);
    (mockFiscalSecrets.revealSecret as jest.Mock).mockImplementation(
      async (_scope: string, name: string) => {
        if (name === 'sol-user') return 'MODDATOS';
        if (name === 'sol-password') return 'clave-demo';
        throw new NotFoundException('missing');
      },
    );

    const result = await service.upsert({
      solUser: ' MODDATOS ',
      password: ' clave-demo ',
    });

    expect(mockFiscalSecrets.upsertSecret).toHaveBeenCalledWith(
      'sunat-direct:sol-credentials',
      'sol-user',
      'MODDATOS',
    );
    expect(mockFiscalSecrets.deleteSecret).toHaveBeenCalledWith(
      'sunat-direct:sol-credentials',
      'sol-username',
    );
    expect(mockFiscalSecrets.upsertSecret).toHaveBeenCalledWith(
      'sunat-direct:sol-credentials',
      'sol-password',
      'clave-demo',
    );
    expect(result).toEqual(
      expect.objectContaining({
        configured: true,
        source: 'FISCAL_SECRET',
        usernameConfigured: true,
        passwordConfigured: true,
        usernameMode: 'RUC_PLUS_SOL_USER',
      }),
    );
  });

  it('resuelve credenciales cifradas antes que variables de entorno', async () => {
    (mockFiscalSecrets.revealSecret as jest.Mock).mockImplementation(
      async (_scope: string, name: string) => {
        if (name === 'sol-user') return 'MODDATOS';
        if (name === 'sol-password') return 'clave-demo';
        throw new NotFoundException('missing');
      },
    );
    (mockConfig.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'SUNAT_SOL_USERNAME') return '20123456789ENVUSER';
      if (key === 'SUNAT_SOL_PASSWORD') return 'env-password';
      return undefined;
    });

    await expect(service.resolveCredentials('20123456789')).resolves.toEqual({
      username: '20123456789MODDATOS',
      password: 'clave-demo',
      source: 'FISCAL_SECRET',
      usernameMode: 'RUC_PLUS_SOL_USER',
    });
  });

  it('usa variables de entorno como fallback si no hay secretos cifrados', async () => {
    mockNoStoredSecrets();
    (mockConfig.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'SUNAT_SOL_USER') return 'MODDATOS';
      if (key === 'SUNAT_SOL_PASSWORD') return 'env-password';
      return undefined;
    });

    await expect(service.resolveCredentials('20123456789')).resolves.toEqual({
      username: '20123456789MODDATOS',
      password: 'env-password',
      source: 'ENV',
      usernameMode: 'RUC_PLUS_SOL_USER',
    });
  });

  it('rechaza configuración incompleta de secretos cifrados', async () => {
    (mockFiscalSecrets.revealSecret as jest.Mock).mockImplementation(
      async (_scope: string, name: string) => {
        if (name === 'sol-password') return 'clave-demo';
        throw new NotFoundException('missing');
      },
    );

    await expect(service.resolveCredentials('20123456789')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza guardar ambos modos de usuario a la vez', async () => {
    await expect(
      service.upsert({
        solUsername: '20123456789MODDATOS',
        solUser: 'MODDATOS',
        password: 'clave-demo',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
