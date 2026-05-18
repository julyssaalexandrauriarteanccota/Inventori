import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TipoProducto } from '@erp/shared';

import { QueryProductoDto } from './query-producto.dto';

describe('QueryProductoDto', () => {
  it('convierte "true" y "false" a booleanos reales', () => {
    const dto = plainToInstance(QueryProductoDto, {
      esConsumible: 'false',
      tieneNumeroSerie: 'true',
    });

    expect(dto.esConsumible).toBe(false);
    expect(dto.tieneNumeroSerie).toBe(true);
  });

  it('convierte excluirTipos CSV a arreglo de tipos validos', async () => {
    const dto = plainToInstance(QueryProductoDto, {
      excluirTipos: 'SERVICIO,EQUIPO',
    });

    expect(dto.excluirTipos).toEqual([
      TipoProducto.SERVICIO,
      TipoProducto.EQUIPO,
    ]);
    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toEqual([]);
  });
});
