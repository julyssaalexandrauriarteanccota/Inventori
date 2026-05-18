// Doc 09 §6 — total en letras para representación impresa SUNAT.
// Formato esperado: "DOSCIENTOS TREINTA Y SEIS Y 00/100 SOLES".

const UNIDADES = [
  '',
  'UNO',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISEIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
  'VEINTE',
];

const DECENAS = [
  '',
  '',
  'VEINTI',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
];

const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

function decenas(n: number): string {
  if (n <= 20) return UNIDADES[n];
  if (n < 30) return `VEINTI${UNIDADES[n - 20]}`;
  const dec = Math.floor(n / 10);
  const uni = n % 10;
  if (uni === 0) return DECENAS[dec];
  return `${DECENAS[dec]} Y ${UNIDADES[uni]}`;
}

function centenas(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const cen = Math.floor(n / 100);
  const resto = n % 100;
  const cenStr = CENTENAS[cen];
  const restoStr = decenas(resto);
  return cenStr && restoStr ? `${cenStr} ${restoStr}` : cenStr || restoStr;
}

function miles(n: number): string {
  if (n === 0) return '';
  if (n < 1000) return centenas(n);
  const mil = Math.floor(n / 1000);
  const resto = n % 1000;
  const milStr = mil === 1 ? 'MIL' : `${centenas(mil)} MIL`;
  return resto === 0 ? milStr : `${milStr} ${centenas(resto)}`;
}

function millones(n: number): string {
  if (n < 1_000_000) return miles(n);
  const mill = Math.floor(n / 1_000_000);
  const resto = n % 1_000_000;
  const millStr = mill === 1 ? 'UN MILLON' : `${miles(mill)} MILLONES`;
  return resto === 0 ? millStr : `${millStr} ${miles(resto)}`;
}

/**
 * Convierte un monto en soles a letras, formato SUNAT-PE.
 * Ej: 1236.5 → "MIL DOSCIENTOS TREINTA Y SEIS Y 50/100 SOLES".
 */
export function numeroALetras(monto: number, moneda = 'SOLES'): string {
  const safe = Number.isFinite(monto) ? monto : 0;
  const abs = Math.abs(safe);
  let entero = Math.floor(abs);
  let cents = Math.round((abs - entero) * 100);
  if (cents === 100) {
    entero += 1;
    cents = 0;
  }

  const enteroStr = entero === 0 ? 'CERO' : millones(entero);
  const centsStr = String(cents).padStart(2, '0');
  const signo = safe < 0 ? 'MENOS ' : '';
  return `${signo}${enteroStr} Y ${centsStr}/100 ${moneda}`;
}
