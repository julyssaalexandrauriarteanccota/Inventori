import { plainToInstance } from 'class-transformer';

import { QueryStockDto } from './query-stock.dto';

describe('QueryStockDto', () => {
  it('convierte "true" y "false" a booleanos reales', () => {
    const dto = plainToInstance(QueryStockDto, {
      stockBajo: 'false',
    });

    expect(dto.stockBajo).toBe(false);
  });
});
