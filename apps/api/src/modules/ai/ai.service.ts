import {
  Injectable,
  ServiceUnavailableException,
  HttpException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import type {
  OcrInvoiceResult,
  OcrSerialResult,
  TicketClassificationResult,
} from '@erp/shared';
import { ClasificarTicketDto } from './dto/clasificar-ticket.dto';

@Injectable()
export class AiService {
  private readonly baseUrl: string;
  private readonly internalKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );
    this.internalKey = this.config.get<string>('AI_INTERNAL_KEY', '');
  }

  private get headers() {
    return { 'X-Internal-Key': this.internalKey };
  }

  private handleError(err: unknown): never {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as {
        response: { status: number; data: unknown };
      };
      const responseData = axiosErr.response.data;

      if (typeof responseData === 'string') {
        throw new HttpException(responseData, axiosErr.response.status);
      }

      if (responseData && typeof responseData === 'object') {
        throw new HttpException(
          responseData as Record<string, unknown>,
          axiosErr.response.status,
        );
      }

      throw new HttpException(
        { message: 'Servicio AI no disponible' },
        axiosErr.response.status,
      );
    }
    throw new ServiceUnavailableException('Servicio AI no disponible');
  }

  async extractInvoiceData(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<OcrInvoiceResult> {
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename: originalName,
      contentType: mimeType,
    });
    try {
      const { data } = await firstValueFrom(
        this.http.post<OcrInvoiceResult>(`${this.baseUrl}/ocr/invoice`, form, {
          headers: { ...form.getHeaders(), ...this.headers },
        }),
      );
      return data;
    } catch (err) {
      this.handleError(err);
    }
  }

  async extractSerialNumbers(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<OcrSerialResult> {
    const form = new FormData();
    form.append('file', fileBuffer, {
      filename: originalName,
      contentType: mimeType,
    });
    try {
      const { data } = await firstValueFrom(
        this.http.post<OcrSerialResult>(`${this.baseUrl}/ocr/serial`, form, {
          headers: { ...form.getHeaders(), ...this.headers },
        }),
      );
      return data;
    } catch (err) {
      this.handleError(err);
    }
  }

  async classifyTicket(
    dto: ClasificarTicketDto,
  ): Promise<TicketClassificationResult> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<TicketClassificationResult>(
          `${this.baseUrl}/clasificar/ticket`,
          dto,
          {
            headers: this.headers,
          },
        ),
      );
      return data;
    } catch (err) {
      this.handleError(err);
    }
  }
}
