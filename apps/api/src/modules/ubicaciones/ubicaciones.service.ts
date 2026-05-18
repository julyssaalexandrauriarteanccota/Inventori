import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { LocationSearchResult } from '@erp/shared';
import { BuscarUbicacionDto, ReverseGeocodeDto } from './dto';

type NominatimAddress = {
  city?: string;
  city_district?: string;
  county?: string;
  municipality?: string;
  neighbourhood?: string;
  state?: string;
  state_district?: string;
  suburb?: string;
  town?: string;
  village?: string;
};

type NominatimSearchResponse = {
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

type NominatimReverseResponse = {
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

@Injectable()
export class UbicacionesService {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'NOMINATIM_BASE_URL',
      'https://nominatim.openstreetmap.org',
    );
  }

  private get headers() {
    return {
      Accept: 'application/json',
      'Accept-Language': 'es-PE,es;q=0.9',
      'User-Agent': 'Inventori/1.0 (+https://localhost)',
    };
  }

  private handleError(err: unknown): never {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as { response: { status: number; data: unknown } };
      throw new HttpException(
        axiosErr.response.data ?? 'Servicio de geocodificación no disponible',
        axiosErr.response.status,
      );
    }

    throw new ServiceUnavailableException(
      'Servicio de geocodificación no disponible',
    );
  }

  private parseAddress(address?: NominatimAddress) {
    return {
      distrito:
        address?.city_district ??
        address?.suburb ??
        address?.neighbourhood ??
        address?.town ??
        address?.village ??
        address?.city ??
        null,
      provincia:
        address?.state_district ??
        address?.county ??
        address?.municipality ??
        address?.city ??
        null,
      departamento: address?.state ?? null,
    };
  }

  private mapResult(
    result: NominatimSearchResponse | NominatimReverseResponse,
  ): LocationSearchResult {
    const parsed = this.parseAddress(result.address);

    return {
      direccion: result.display_name,
      latitud: Number(result.lat),
      longitud: Number(result.lon),
      distrito: parsed.distrito,
      provincia: parsed.provincia,
      departamento: parsed.departamento,
    };
  }

  async buscar(dto: BuscarUbicacionDto): Promise<LocationSearchResult[]> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<NominatimSearchResponse[]>(`${this.baseUrl}/search`, {
          headers: this.headers,
          params: {
            q: dto.q,
            format: 'jsonv2',
            addressdetails: 1,
            countrycodes: 'pe',
            limit: dto.limit ?? 5,
          },
        }),
      );

      return data.map((result) => this.mapResult(result));
    } catch (err) {
      this.handleError(err);
    }
  }

  async reversa(dto: ReverseGeocodeDto): Promise<LocationSearchResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<NominatimReverseResponse>(`${this.baseUrl}/reverse`, {
          headers: this.headers,
          params: {
            lat: dto.latitud,
            lon: dto.longitud,
            format: 'jsonv2',
            addressdetails: 1,
            zoom: 18,
          },
        }),
      );

      return this.mapResult(data);
    } catch (err) {
      this.handleError(err);
    }
  }
}
