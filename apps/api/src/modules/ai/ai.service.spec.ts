import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AiService } from './ai.service';
import { ClasificarTicketDto } from './dto/clasificar-ticket.dto';

const mockHttpService = {
  post: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultVal: string) => {
    if (key === 'AI_SERVICE_URL') return 'http://localhost:8000';
    if (key === 'AI_INTERNAL_KEY') return 'test-key';
    return defaultVal;
  }),
};

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════
  //  classifyTicket
  // ═══════════════════════════════════════════

  describe('classifyTicket', () => {
    const dto: ClasificarTicketDto = {
      titulo: 'Pantalla rota',
      descripcion: 'La pantalla del laptop tiene una grieta',
      fallaReportada: 'Daño físico en pantalla',
    };

    const mockResult = {
      prioridadSugerida: 'ALTA',
      tipoServicioSugerido: 'REPARACION',
      categoriaFalla: 'HARDWARE',
      confianza: 92,
      razonamiento: 'Daño físico visible requiere reparación urgente',
    };

    it('should call /clasificar/ticket with correct URL and X-Internal-Key header', async () => {
      mockHttpService.post.mockReturnValue(of({ data: mockResult }));

      const result = await service.classifyTicket(dto);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/clasificar/ticket',
        dto,
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Internal-Key': 'test-key' }),
        }),
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw ServiceUnavailableException on connection error', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('ECONNREFUSED')),
      );

      await expect(service.classifyTicket(dto)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should forward HttpException when AI returns 400', async () => {
      const axiosError = {
        response: {
          status: 400,
          data: { message: 'Datos inválidos' },
        },
      };
      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(service.classifyTicket(dto)).rejects.toThrow(HttpException);
    });
  });

  // ═══════════════════════════════════════════
  //  extractInvoiceData
  // ═══════════════════════════════════════════

  describe('extractInvoiceData', () => {
    const buffer = Buffer.from('fake-pdf');
    const mockInvoice = {
      proveedorNombre: 'Proveedor SA',
      proveedorRuc: '20123456789',
      numeroFactura: 'F001-0001',
      fechaEmision: '2024-01-15',
      subtotal: 1000,
      igv: 180,
      total: 1180,
      moneda: 'PEN',
      items: [],
      confianza: 88,
    };

    it('should call /ocr/invoice and return parsed invoice data', async () => {
      mockHttpService.post.mockReturnValue(of({ data: mockInvoice }));

      const result = await service.extractInvoiceData(
        buffer,
        'invoice.pdf',
        'application/pdf',
      );

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/ocr/invoice',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Internal-Key': 'test-key' }),
        }),
      );
      expect(result).toEqual(mockInvoice);
    });

    it('should throw ServiceUnavailableException on network failure', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Network Error')),
      );

      await expect(
        service.extractInvoiceData(buffer, 'invoice.pdf', 'application/pdf'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
