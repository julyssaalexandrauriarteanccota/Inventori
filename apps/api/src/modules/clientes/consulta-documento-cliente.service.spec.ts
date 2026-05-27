import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';
import { ConsultaDocumentoClienteService } from './consulta-documento-cliente.service';
import { PrismaService } from '../../database/prisma.service';
import { PadronSunatRucService } from '../facturacion/padron-sunat-ruc.service';

const mockHttpService = {
  get: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockPrismaService = {
  cliente: {
    findFirst: jest.fn(),
  },
  clienteValidacionSunat: {
    upsert: jest.fn(),
  },
};

const mockPadronSunatRucService = {
  findByRuc: jest.fn(),
};

describe('ConsultaDocumentoClienteService', () => {
  let service: ConsultaDocumentoClienteService;

  beforeEach(() => {
    jest.resetAllMocks();
    mockConfigService.get.mockImplementation(
      (key: string, fallback?: string) => {
        if (key === 'DECOLECTA_API_TOKEN') return 'token-test';
        return fallback;
      },
    );
    mockPrismaService.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });
    mockPrismaService.clienteValidacionSunat.upsert.mockResolvedValue({});
    mockPadronSunatRucService.findByRuc.mockResolvedValue(null);

    service = new ConsultaDocumentoClienteService(
      mockHttpService as unknown as HttpService,
      mockConfigService as unknown as ConfigService,
      mockPrismaService as unknown as PrismaService,
      mockPadronSunatRucService as unknown as PadronSunatRucService,
    );
  });

  it('consulta y normaliza RUC desde Decolecta', async () => {
    mockConfigService.get.mockImplementation(
      (key: string, fallback?: string) => {
        if (key === 'DECOLECTA_API_TOKEN') return 'token-test';
        if (key === 'DOCUMENT_LOOKUP_PROVIDER_ORDER')
          return 'DECOLECTA,APISPERU';
        return fallback;
      },
    );
    mockHttpService.get.mockReturnValue(
      of({
        data: {
          razon_social: 'EMPRESA SAC',
          numero_documento: '20123456789',
          estado: 'ACTIVO',
          condicion: 'HABIDO',
          direccion: 'AV LIMA 123',
          departamento: 'LIMA',
          provincia: 'LIMA',
          distrito: 'MIRAFLORES',
          ubigeo: '150122',
        },
      }),
    );

    const result = await service.consultar({
      tipoDocumento: 'RUC',
      numeroDocumento: '20123456789',
    });

    expect(result.razonSocial).toBe('EMPRESA SAC');
    expect(result.estado).toBe('ACTIVO');
    expect(
      mockPrismaService.clienteValidacionSunat.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tipoDocumentoSunat_numeroDocumento: {
            tipoDocumentoSunat: '6',
            numeroDocumento: '20123456789',
          },
        },
        update: expect.objectContaining({
          proveedor: 'DECOLECTA',
          direccionFiscal: 'AV LIMA 123',
          ubigeo: '150122',
          departamento: 'LIMA',
          provincia: 'LIMA',
          distrito: 'MIRAFLORES',
          estado: 'ACTIVO',
          condicionDomicilio: 'HABIDO',
        }),
        create: expect.objectContaining({
          proveedor: 'DECOLECTA',
          ubigeo: '150122',
        }),
      }),
    );
  });

  it('consulta RUC desde padrón SUNAT local antes de proveedores externos', async () => {
    mockPadronSunatRucService.findByRuc.mockResolvedValue({
      ruc: '20123456789',
      razonSocial: 'LOCAL EMPRESA SAC',
      estado: 'ACTIVO',
      condicionDomicilio: 'HABIDO',
      direccionFiscal: 'JR LOCAL 123',
      departamento: 'LIMA',
      provincia: 'LIMA',
      distrito: 'LINCE',
      ubigeo: '150116',
    });

    const result = await service.consultar({
      tipoDocumento: 'RUC',
      numeroDocumento: '20123456789',
    });

    expect(result.proveedor).toBe('SUNAT_PADRON_LOCAL');
    expect(result.razonSocial).toBe('LOCAL EMPRESA SAC');
    expect(mockHttpService.get).not.toHaveBeenCalled();
    expect(
      mockPrismaService.clienteValidacionSunat.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          proveedor: 'SUNAT_PADRON_LOCAL',
          direccionFiscal: 'JR LOCAL 123',
          ubigeo: '150116',
          distrito: 'LINCE',
          estado: 'ACTIVO',
          condicionDomicilio: 'HABIDO',
        }),
      }),
    );
  });

  it('en modo local solo no consume APIs cuando el RUC no existe en padrón', async () => {
    await expect(
      service.consultar({
        tipoDocumento: 'RUC',
        numeroDocumento: '20123456789',
        modo: 'LOCAL_ONLY',
      }),
    ).rejects.toThrow('RUC no encontrado en padrón SUNAT local');

    expect(mockHttpService.get).not.toHaveBeenCalled();
  });

  it('en modo externo omite padrón local y consulta proveedores configurados', async () => {
    mockConfigService.get.mockImplementation(
      (key: string, fallback?: string) => {
        if (key === 'DECOLECTA_API_TOKEN') return 'token-test';
        if (key === 'DOCUMENT_LOOKUP_PROVIDER_ORDER')
          return 'SUNAT_PADRON_LOCAL,DECOLECTA';
        return fallback;
      },
    );
    mockPadronSunatRucService.findByRuc.mockResolvedValue({
      ruc: '20123456789',
      razonSocial: 'LOCAL EMPRESA SAC',
      estado: 'ACTIVO',
      condicionDomicilio: 'HABIDO',
      direccionFiscal: 'JR LOCAL 123',
      departamento: 'LIMA',
      provincia: 'LIMA',
      distrito: 'LINCE',
      ubigeo: '150116',
    });
    mockHttpService.get.mockReturnValue(
      of({
        data: {
          razon_social: 'EMPRESA API SAC',
          numero_documento: '20123456789',
          estado: 'ACTIVO',
          condicion: 'HABIDO',
        },
      }),
    );

    const result = await service.consultar({
      tipoDocumento: 'RUC',
      numeroDocumento: '20123456789',
      modo: 'EXTERNAL_ONLY',
    });

    expect(result.proveedor).toBe('DECOLECTA');
    expect(result.razonSocial).toBe('EMPRESA API SAC');
    expect(mockPadronSunatRucService.findByRuc).not.toHaveBeenCalled();
  });

  it('consulta y normaliza DNI desde Decolecta', async () => {
    mockConfigService.get.mockImplementation(
      (key: string, fallback?: string) => {
        if (key === 'DECOLECTA_API_TOKEN') return 'token-test';
        if (key === 'DOCUMENT_LOOKUP_PROVIDER_ORDER')
          return 'DECOLECTA,APISPERU';
        return fallback;
      },
    );
    mockHttpService.get.mockReturnValue(
      of({
        data: {
          first_name: 'JUAN CARLOS',
          first_last_name: 'PEREZ',
          second_last_name: 'ROJAS',
          full_name: 'PEREZ ROJAS JUAN CARLOS',
          document_number: '12345678',
        },
      }),
    );

    const result = await service.consultar({
      tipoDocumento: 'DNI',
      numeroDocumento: '12345678',
    });

    expect(result.nombres).toBe('JUAN CARLOS');
    expect(result.apellidoPaterno).toBe('PEREZ');
    expect(result.estado).toBe('VALIDO');
    expect(
      mockPrismaService.clienteValidacionSunat.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tipoDocumentoSunat_numeroDocumento: {
            tipoDocumentoSunat: '1',
            numeroDocumento: '12345678',
          },
        },
      }),
    );
  });

  it('consulta RUC con APISPERU cuando Decolecta no está configurado', async () => {
    mockConfigService.get.mockImplementation(
      (key: string, fallback?: string) => {
        if (key === 'DECOLECTA_API_TOKEN') return '';
        if (key === 'APISPERU_API_TOKEN') return 'apisperu-token';
        return fallback;
      },
    );
    mockHttpService.get.mockReturnValue(
      of({
        data: {
          ruc: '20123456789',
          razonSocial: 'APISPERU EMPRESA SAC',
          nombreComercial: 'APISPERU DEMO',
          telefonos: ['999888777'],
          estado: 'ACTIVO',
          condicion: 'HABIDO',
          direccion: 'AV API 123',
          departamento: 'LIMA',
          provincia: 'LIMA',
          distrito: 'SURCO',
          ubigeo: '150140',
          capital: '10000',
        },
      }),
    );

    const result = await service.consultar({
      tipoDocumento: 'RUC',
      numeroDocumento: '20123456789',
    });

    expect(result.proveedor).toBe('APISPERU');
    expect(result.razonSocial).toBe('APISPERU EMPRESA SAC');
    expect(result.nombreComercial).toBe('APISPERU DEMO');
    expect(result.telefonos).toEqual(['999888777']);
    expect(mockHttpService.get).toHaveBeenCalledWith(
      'https://dniruc.apisperu.com/api/v1/ruc/20123456789',
      expect.objectContaining({
        params: { token: 'apisperu-token' },
      }),
    );
  });

  it('hace fallback a APISPERU si Decolecta falla', async () => {
    mockConfigService.get.mockImplementation(
      (key: string, fallback?: string) => {
        if (key === 'DECOLECTA_API_TOKEN') return 'token-test';
        if (key === 'APISPERU_API_TOKEN') return 'apisperu-token';
        return fallback;
      },
    );
    mockHttpService.get
      .mockReturnValueOnce(throwError(() => new AxiosError('timeout')))
      .mockReturnValueOnce(
        of({
          data: {
            dni: '12345678',
            nombres: 'ANA MARIA',
            apellidoPaterno: 'RAMOS',
            apellidoMaterno: 'DIAZ',
            codVerifica: '5',
          },
        }),
      );

    const result = await service.consultar({
      tipoDocumento: 'DNI',
      numeroDocumento: '12345678',
    });

    expect(result.proveedor).toBe('APISPERU');
    expect(result.codVerifica).toBe('5');
    expect(mockHttpService.get).toHaveBeenCalledTimes(2);
  });

  it('rechaza documentos inválidos antes de llamar al proveedor', async () => {
    await expect(
      service.consultar({ tipoDocumento: 'DNI', numeroDocumento: '00000000' }),
    ).rejects.toThrow(BadRequestException);

    expect(mockHttpService.get).not.toHaveBeenCalled();
  });

  it('falla controlado cuando falta el token', async () => {
    mockConfigService.get.mockImplementation(
      (key: string, fallback?: string) => {
        if (key === 'DECOLECTA_API_TOKEN') return '';
        return fallback;
      },
    );

    await expect(
      service.consultar({
        tipoDocumento: 'RUC',
        numeroDocumento: '20123456789',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('normaliza caída del proveedor como servicio no disponible', async () => {
    mockHttpService.get.mockReturnValue(
      throwError(() => new AxiosError('timeout')),
    );

    await expect(
      service.consultar({
        tipoDocumento: 'RUC',
        numeroDocumento: '20123456789',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
