/**
 * Validadores SUNAT — espejo del backend `ValidacionFiscalService`.
 *
 * Se replican aquí para validar pre-submit en el POS y dar feedback
 * inmediato al usuario. El backend sigue siendo la verdad final
 * (la validación fiscal completa requiere acceso a BD: padrón, certificado,
 * credenciales SOL, etc.). Aquí cubrimos las que el usuario puede
 * corregir antes de hacer click en "Cobrar".
 */

/** Umbral SUNAT: boletas iguales o mayores a S/ 700 requieren DNI o RUC del receptor. */
export const BOLETA_UMBRAL_IDENTIFICACION = 700;

/**
 * RUC SUNAT válido — espejo exacto de `validacion-fiscal.service.ts:407-417`.
 *
 * - 11 dígitos
 * - Empieza por 10, 15, 17 o 20
 * - Dígito verificador módulo 11 con factores [5,4,3,2,7,6,5,4,3,2]
 */
export function isSunatRuc(value: string | null | undefined): boolean {
  if (!value) return false;
  if (!/^(10|15|17|20)\d{9}$/.test(value)) return false;
  const factors = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = factors.reduce(
    (total, factor, index) => total + Number(value[index]) * factor,
    0,
  );
  const remainder = sum % 11;
  const check = remainder < 2 ? remainder : 11 - remainder;
  return check === Number(value[10]);
}

/** DNI peruano: 8 dígitos numéricos. */
export function isDniPeruano(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^\d{8}$/.test(value);
}
