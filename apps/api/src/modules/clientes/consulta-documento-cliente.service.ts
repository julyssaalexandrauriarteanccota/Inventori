import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import type {
  ConsultaDocumentoClientePayload,
  ConsultaDocumentoClienteProveedor,
  ConsultaDocumentoClienteResult,
} from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { PadronSunatRucService } from '../facturacion/padron-sunat-ruc.service';

type DecolectaRucResponse = {
  razon_social?: string;
  numero_documento?: string;
  estado?: string;
  condicion?: string;
  direccion?: string;
  ubigeo?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
};

type DecolectaDniResponse = {
  first_name?: string;
  first_last_name?: string;
  second_last_name?: string;
  full_name?: string;
  document_number?: string;
};

type ApisperuRucResponse = {
  ruc?: string;
  razonSocial?: string;
  nombreComercial?: string;
  telefonos?: string[];
  estado?: string;
  condicion?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
  capital?: string;
};

type ApisperuDniResponse = {
  dni?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  codVerifica?: string;
};

const DEFAULT_DECOLECTA_BASE_URL = 'https://api.decolecta.com';
const DEFAULT_DECOLECTA_TIMEOUT_MS = 8000;
const DEFAULT_APISPERU_BASE_URL = 'https://dniruc.apisperu.com/api/v1';
const DEFAULT_APISPERU_TIMEOUT_MS = 8000;
const DEFAULT_PROVIDER_ORDER: ConsultaDocumentoClienteProveedor[] = [
  'SUNAT_PADRON_LOCAL',
  'DECOLECTA',
  'APISPERU',
];

@Injectable()
export class ConsultaDocumentoClienteService {
  private readonly logger = new Logger(ConsultaDocumentoClienteService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly padronSunatRuc: PadronSunatRucService,
  ) {}

  async consultar(
    dto: ConsultaDocumentoClientePayload,
  ): Promise<ConsultaDocumentoClienteResult> {
    const tipoDocumento = dto.tipoDocumento;
    const numeroDocumento = this.sanitizeDocumento(dto.numeroDocumento);
    const modo = dto.modo ?? 'AUTO';
    this.validateDocumento(tipoDocumento, numeroDocumento);

    if (modo === 'LOCAL_ONLY' && tipoDocumento === 'DNI') {
      throw new NotFoundException('El padrón SUNAT local solo consulta RUC');
    }

    let lastError: unknown;
    let attemptedProvider = false;

    for (const provider of this.providerOrder(tipoDocumento, modo)) {
      if (provider === 'SUNAT_PADRON_LOCAL') {
        const result = await this.consultarRucPadronLocal(numeroDocumento);
        if (result) {
          await this.persistirValidacion(result);
          return result;
        }
        lastError ??= new NotFoundException(
          'RUC no encontrado en padrón SUNAT local. Puedes consultar una API externa.',
        );
        continue;
      }

      const token = this.providerToken(provider);
      if (!token) {
        lastError ??= new ServiceUnavailableException(
          'Consulta documental no configurada',
        );
        continue;
      }

      attemptedProvider = true;

      try {
        const result =
          tipoDocumento === 'RUC'
            ? await this.consultarRuc(provider, numeroDocumento, token)
            : await this.consultarDni(provider, numeroDocumento, token);

        await this.persistirValidacion(result);
        return result;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Proveedor documental ${provider} no resolvió ${tipoDocumento} ${numeroDocumento}: ${this.errorMessage(error)}`,
        );
      }
    }

    if (modo === 'LOCAL_ONLY' && lastError instanceof Error) {
      throw lastError;
    }

    if (!attemptedProvider) {
      throw new ServiceUnavailableException(
        'Consulta documental no configurada',
      );
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new ServiceUnavailableException(
      'No se pudo consultar ningún proveedor documental',
    );
  }

  private sanitizeDocumento(value: string) {
    return String(value ?? '').replace(/\D/g, '');
  }

  private validateDocumento(
    tipoDocumento: ConsultaDocumentoClientePayload['tipoDocumento'],
    numeroDocumento: string,
  ) {
    if (tipoDocumento === 'DNI') {
      if (!/^\d{8}$/.test(numeroDocumento) || numeroDocumento === '00000000') {
        throw new BadRequestException(
          'DNI debe tener 8 dígitos y no puede ser 00000000',
        );
      }
      return;
    }

    if (!/^(10|20)\d{9}$/.test(numeroDocumento)) {
      throw new BadRequestException(
        'RUC debe empezar con 10 o 20 y tener 11 dígitos',
      );
    }
  }

  private async consultarRuc(
    provider: ConsultaDocumentoClienteProveedor,
    numeroDocumento: string,
    token: string,
  ): Promise<ConsultaDocumentoClienteResult> {
    if (provider === 'SUNAT_PADRON_LOCAL') {
      const result = await this.consultarRucPadronLocal(numeroDocumento);
      if (!result) {
        throw new NotFoundException('RUC no encontrado en padrón SUNAT local');
      }
      return result;
    }

    if (provider === 'APISPERU') {
      return this.consultarRucApisperu(numeroDocumento, token);
    }

    const data = await this.getDecolecta<DecolectaRucResponse>(
      '/v1/sunat/ruc',
      numeroDocumento,
      token,
    );

    if (!data.razon_social || !data.numero_documento) {
      throw new UnprocessableEntityException(
        'Decolecta no devolvió datos suficientes para el RUC',
      );
    }

    return {
      tipoDocumento: 'RUC',
      tipoDocumentoSunat: '6',
      numeroDocumento: data.numero_documento,
      proveedor: 'DECOLECTA',
      consultadoAt: new Date().toISOString(),
      razonSocial: data.razon_social,
      direccion: data.direccion,
      departamento: data.departamento,
      provincia: data.provincia,
      distrito: data.distrito,
      ubigeo: data.ubigeo,
      estado: data.estado,
      condicionDomicilio: data.condicion,
    };
  }

  private async consultarDni(
    provider: ConsultaDocumentoClienteProveedor,
    numeroDocumento: string,
    token: string,
  ): Promise<ConsultaDocumentoClienteResult> {
    if (provider === 'SUNAT_PADRON_LOCAL') {
      throw new NotFoundException('El padrón SUNAT local no consulta DNI');
    }

    if (provider === 'APISPERU') {
      return this.consultarDniApisperu(numeroDocumento, token);
    }

    const data = await this.getDecolecta<DecolectaDniResponse>(
      '/v1/reniec/dni',
      numeroDocumento,
      token,
    );

    if (!data.first_name || !data.first_last_name || !data.document_number) {
      throw new UnprocessableEntityException(
        'Decolecta no devolvió datos suficientes para el DNI',
      );
    }

    return {
      tipoDocumento: 'DNI',
      tipoDocumentoSunat: '1',
      numeroDocumento: data.document_number,
      proveedor: 'DECOLECTA',
      consultadoAt: new Date().toISOString(),
      nombres: data.first_name,
      apellidoPaterno: data.first_last_name,
      apellidoMaterno: data.second_last_name,
      nombreCompleto:
        data.full_name ??
        [data.first_last_name, data.second_last_name, data.first_name]
          .filter(Boolean)
          .join(' '),
      estado: 'VALIDO',
    };
  }

  private async consultarRucApisperu(
    numeroDocumento: string,
    token: string,
  ): Promise<ConsultaDocumentoClienteResult> {
    const data = await this.getApisperu<ApisperuRucResponse>(
      'ruc',
      numeroDocumento,
      token,
    );

    if (!data.razonSocial || !data.ruc) {
      throw new UnprocessableEntityException(
        'APISPERU no devolvió datos suficientes para el RUC',
      );
    }

    return {
      tipoDocumento: 'RUC',
      tipoDocumentoSunat: '6',
      numeroDocumento: data.ruc,
      proveedor: 'APISPERU',
      consultadoAt: new Date().toISOString(),
      razonSocial: data.razonSocial,
      nombreComercial: data.nombreComercial,
      telefonos: Array.isArray(data.telefonos) ? data.telefonos : undefined,
      direccion: data.direccion,
      departamento: data.departamento,
      provincia: data.provincia,
      distrito: data.distrito,
      ubigeo: data.ubigeo,
      estado: data.estado,
      condicionDomicilio: data.condicion,
      capital: data.capital,
    };
  }

  private async consultarRucPadronLocal(
    numeroDocumento: string,
  ): Promise<ConsultaDocumentoClienteResult | null> {
    const item = await this.padronSunatRuc.findByRuc(numeroDocumento);

    if (!item) return null;

    return {
      tipoDocumento: 'RUC',
      tipoDocumentoSunat: '6',
      numeroDocumento: item.ruc,
      proveedor: 'SUNAT_PADRON_LOCAL',
      consultadoAt: new Date().toISOString(),
      razonSocial: item.razonSocial,
      direccion: item.direccionFiscal ?? undefined,
      departamento: item.departamento ?? undefined,
      provincia: item.provincia ?? undefined,
      distrito: item.distrito ?? undefined,
      ubigeo: item.ubigeo ?? undefined,
      estado: item.estado,
      condicionDomicilio: item.condicionDomicilio ?? undefined,
    };
  }

  private async consultarDniApisperu(
    numeroDocumento: string,
    token: string,
  ): Promise<ConsultaDocumentoClienteResult> {
    const data = await this.getApisperu<ApisperuDniResponse>(
      'dni',
      numeroDocumento,
      token,
    );

    if (!data.nombres || !data.apellidoPaterno || !data.dni) {
      throw new UnprocessableEntityException(
        'APISPERU no devolvió datos suficientes para el DNI',
      );
    }

    return {
      tipoDocumento: 'DNI',
      tipoDocumentoSunat: '1',
      numeroDocumento: data.dni,
      proveedor: 'APISPERU',
      consultadoAt: new Date().toISOString(),
      nombres: data.nombres,
      apellidoPaterno: data.apellidoPaterno,
      apellidoMaterno: data.apellidoMaterno,
      nombreCompleto: [
        data.apellidoPaterno,
        data.apellidoMaterno,
        data.nombres,
      ]
        .filter(Boolean)
        .join(' '),
      codVerifica: data.codVerifica,
      estado: 'VALIDO',
    };
  }

  private async getDecolecta<T>(
    path: string,
    numeroDocumento: string,
    token: string,
  ) {
    const baseUrl = this.config.get<string>(
      'DECOLECTA_API_BASE_URL',
      DEFAULT_DECOLECTA_BASE_URL,
    );
    const timeout = Number(
      this.config.get<string>(
        'DECOLECTA_TIMEOUT_MS',
        String(DEFAULT_DECOLECTA_TIMEOUT_MS),
      ),
    );

    try {
      const { data } = await firstValueFrom(
        this.http.get<T>(`${baseUrl.replace(/\/$/, '')}${path}`, {
          params: { numero: numeroDocumento },
          timeout: Number.isFinite(timeout)
            ? timeout
            : DEFAULT_DECOLECTA_TIMEOUT_MS,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      return data;
    } catch (error) {
      this.handleProviderError(error, numeroDocumento);
    }
  }

  private async getApisperu<T>(
    path: 'dni' | 'ruc',
    numeroDocumento: string,
    token: string,
  ) {
    const baseUrl = this.config.get<string>(
      'APISPERU_API_BASE_URL',
      DEFAULT_APISPERU_BASE_URL,
    );
    const timeout = Number(
      this.config.get<string>(
        'APISPERU_TIMEOUT_MS',
        String(DEFAULT_APISPERU_TIMEOUT_MS),
      ),
    );

    try {
      const { data } = await firstValueFrom(
        this.http.get<T>(
          `${baseUrl.replace(/\/$/, '')}/${path}/${numeroDocumento}`,
          {
            params: { token },
            timeout: Number.isFinite(timeout)
              ? timeout
              : DEFAULT_APISPERU_TIMEOUT_MS,
            headers: { Accept: 'application/json' },
          },
        ),
      );
      return data;
    } catch (error) {
      this.handleProviderError(error, numeroDocumento, 'APISPERU');
    }
  }

  private handleProviderError(
    error: unknown,
    numeroDocumento: string,
    provider: ConsultaDocumentoClienteProveedor = 'DECOLECTA',
  ): never {
    if (error instanceof AxiosError && error.response) {
      const status = error.response.status;
      if (status === 404) {
        throw new NotFoundException(`Documento no encontrado en ${provider}`);
      }
      if (status === 400 || status === 422) {
        throw new UnprocessableEntityException(
          `${provider} no pudo validar el documento consultado`,
        );
      }
    }

    this.logger.warn(
      `${provider} no disponible para consulta documental ${numeroDocumento}`,
    );
    throw new ServiceUnavailableException(
      `No se pudo consultar ${provider}. Completa el cliente manualmente y reintenta luego.`,
    );
  }

  private providerOrder(
    tipoDocumento: ConsultaDocumentoClientePayload['tipoDocumento'],
    modo: ConsultaDocumentoClientePayload['modo'] = 'AUTO',
  ): ConsultaDocumentoClienteProveedor[] {
    const raw = this.config.get<string>(
      'DOCUMENT_LOOKUP_PROVIDER_ORDER',
      DEFAULT_PROVIDER_ORDER.join(','),
    );
    const order = raw
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item): item is ConsultaDocumentoClienteProveedor =>
        DEFAULT_PROVIDER_ORDER.includes(
          item as ConsultaDocumentoClienteProveedor,
        ),
      );

    const resolved = order.length > 0 ? order : DEFAULT_PROVIDER_ORDER;

    if (modo === 'LOCAL_ONLY') {
      return tipoDocumento === 'RUC' ? ['SUNAT_PADRON_LOCAL'] : [];
    }

    const withoutLocal = resolved.filter(
      (provider) => provider !== 'SUNAT_PADRON_LOCAL',
    );

    if (tipoDocumento === 'DNI' || modo === 'EXTERNAL_ONLY') {
      return withoutLocal;
    }

    return resolved;
  }

  private providerToken(provider: ConsultaDocumentoClienteProveedor) {
    if (provider === 'SUNAT_PADRON_LOCAL') return 'local';
    const key =
      provider === 'DECOLECTA' ? 'DECOLECTA_API_TOKEN' : 'APISPERU_API_TOKEN';
    return this.config.get<string>(key, '').trim();
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'error desconocido';
  }

  private async persistirValidacion(result: ConsultaDocumentoClienteResult) {
    const cliente = await this.prisma.cliente.findFirst({
      where:
        result.tipoDocumento === 'RUC'
          ? { ruc: result.numeroDocumento, deletedAt: null }
          : { dni: result.numeroDocumento, deletedAt: null },
      select: { id: true },
    });

    await this.prisma.clienteValidacionSunat.upsert({
      where: {
        tipoDocumentoSunat_numeroDocumento: {
          tipoDocumentoSunat: result.tipoDocumentoSunat,
          numeroDocumento: result.numeroDocumento,
        },
      },
      update: {
        clienteId: cliente?.id ?? null,
        proveedor: result.proveedor,
        nombreNormalizado:
          result.razonSocial ?? result.nombreCompleto ?? result.nombres ?? null,
        direccionFiscal: result.direccion ?? null,
        ubigeo: result.ubigeo ?? null,
        departamento: result.departamento ?? null,
        provincia: result.provincia ?? null,
        distrito: result.distrito ?? null,
        estado: result.estado ?? 'VALIDO',
        condicionDomicilio: result.condicionDomicilio ?? null,
        ultimaValidacionAt: new Date(result.consultadoAt),
      },
      create: {
        clienteId: cliente?.id ?? null,
        tipoDocumentoSunat: result.tipoDocumentoSunat,
        numeroDocumento: result.numeroDocumento,
        proveedor: result.proveedor,
        nombreNormalizado:
          result.razonSocial ?? result.nombreCompleto ?? result.nombres ?? null,
        direccionFiscal: result.direccion ?? null,
        ubigeo: result.ubigeo ?? null,
        departamento: result.departamento ?? null,
        provincia: result.provincia ?? null,
        distrito: result.distrito ?? null,
        estado: result.estado ?? 'VALIDO',
        condicionDomicilio: result.condicionDomicilio ?? null,
        ultimaValidacionAt: new Date(result.consultadoAt),
      },
    });
  }
}
