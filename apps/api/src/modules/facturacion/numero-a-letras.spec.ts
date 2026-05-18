import { numeroALetras } from './numero-a-letras';

describe('numeroALetras (Doc 09 §6 — total en letras)', () => {
  it('cero soles', () => {
    expect(numeroALetras(0)).toBe('CERO Y 00/100 SOLES');
  });

  it('céntimos exactos', () => {
    expect(numeroALetras(0.5)).toBe('CERO Y 50/100 SOLES');
  });

  it('unidades', () => {
    expect(numeroALetras(1)).toBe('UNO Y 00/100 SOLES');
    expect(numeroALetras(15)).toBe('QUINCE Y 00/100 SOLES');
  });

  it('decenas con conjunción Y', () => {
    expect(numeroALetras(31)).toBe('TREINTA Y UNO Y 00/100 SOLES');
    expect(numeroALetras(99)).toBe('NOVENTA Y NUEVE Y 00/100 SOLES');
  });

  it('veintis sin Y', () => {
    expect(numeroALetras(21)).toBe('VEINTIUNO Y 00/100 SOLES');
    expect(numeroALetras(28)).toBe('VEINTIOCHO Y 00/100 SOLES');
  });

  it('cien exacto vs ciento', () => {
    expect(numeroALetras(100)).toBe('CIEN Y 00/100 SOLES');
    expect(numeroALetras(101)).toBe('CIENTO UNO Y 00/100 SOLES');
    expect(numeroALetras(236)).toBe('DOSCIENTOS TREINTA Y SEIS Y 00/100 SOLES');
  });

  it('miles con un mil sin "uno"', () => {
    expect(numeroALetras(1000)).toBe('MIL Y 00/100 SOLES');
    expect(numeroALetras(1236.5)).toBe(
      'MIL DOSCIENTOS TREINTA Y SEIS Y 50/100 SOLES',
    );
    expect(numeroALetras(2500)).toBe('DOS MIL QUINIENTOS Y 00/100 SOLES');
  });

  it('millones', () => {
    expect(numeroALetras(1_000_000)).toBe('UN MILLON Y 00/100 SOLES');
    expect(numeroALetras(2_500_000)).toBe(
      'DOS MILLONES QUINIENTOS MIL Y 00/100 SOLES',
    );
  });

  it('redondeo de centavos', () => {
    expect(numeroALetras(0.999)).toBe('UNO Y 00/100 SOLES'); // 0.999 → entero=0, cents=100→ se redondea
    expect(numeroALetras(0.005)).toBe('CERO Y 01/100 SOLES'); // banker not needed; 0.5 → 1
  });

  it('moneda alternativa', () => {
    expect(numeroALetras(10, 'DOLARES')).toBe('DIEZ Y 00/100 DOLARES');
  });
});
