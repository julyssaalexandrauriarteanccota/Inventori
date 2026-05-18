import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

import { AuditoriaService } from '../../modules/auditoria/auditoria.service';
import { AuditoriaInterceptor } from './auditoria.interceptor';

describe('AuditoriaInterceptor', () => {
  const auditoriaService = {
    registrar: jest.fn(),
  } as unknown as AuditoriaService;

  const interceptor = new AuditoriaInterceptor(auditoriaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createContext(method: string, url: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          ip: '127.0.0.1',
          headers: { 'user-agent': 'jest' },
          user: { sub: 'user-1' },
        }),
      }),
    } as ExecutionContext;
  }

  it('registra auditoria en requests mutables', (done) => {
    const context = createContext('POST', '/api/v1/usuarios/123');
    const next: CallHandler = {
      handle: () => of({ ok: true }),
    };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(auditoriaService.registrar as jest.Mock).toHaveBeenCalledWith(
          expect.objectContaining({
            usuarioId: 'user-1',
            accion: 'CREAR',
            modelo: 'usuarios',
            modeloId: '123',
          }),
        );
        done();
      },
    });
  });

  it('no registra auditoria para requests solo lectura', (done) => {
    const context = createContext('GET', '/api/v1/usuarios');
    const next: CallHandler = {
      handle: () => of({ ok: true }),
    };

    interceptor.intercept(context, next).subscribe({
      next: () => {
        expect(auditoriaService.registrar as jest.Mock).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
