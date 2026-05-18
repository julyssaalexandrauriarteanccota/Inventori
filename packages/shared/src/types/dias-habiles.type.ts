/**
 * Doc 08 §3 — Cálculo de días hábiles para plazo NC excepcional.
 *
 * Define día hábil como cualquier día de lunes a viernes que no sea feriado
 * nacional ni declarado como no laborable. La lista de feriados se inyecta
 * desde la BD (modelo `FeriadoNacional`); este helper es puro y no consulta DB.
 */

export interface FeriadoLike {
  /** Fecha del feriado en zona horaria local. Se compara por componentes año/mes/día. */
  fecha: Date | string
}

function startOfDayLocal(d: Date): Date {
  const x = new Date(d.getTime())
  x.setHours(0, 0, 0, 0)
  return x
}

function sameYmd(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

/**
 * Cuenta días hábiles **transcurridos** entre `desde` (exclusivo) y `hasta`
 * (inclusivo). Si `desde === hasta`, devuelve 0.
 *
 * - Excluye sábados y domingos.
 * - Excluye fechas en `feriados` (comparación por año-mes-día local).
 * - Si `hasta` es anterior a `desde`, devuelve `-diasHabilesEntre(hasta, desde)`.
 */
export function diasHabilesEntre(
  desde: Date | string,
  hasta: Date | string,
  feriados: FeriadoLike[] = [],
): number {
  const d0 = startOfDayLocal(toDate(desde))
  const d1 = startOfDayLocal(toDate(hasta))

  if (d0.getTime() === d1.getTime()) return 0

  const direction = d1.getTime() > d0.getTime() ? 1 : -1
  const start = direction === 1 ? d0 : d1
  const end = direction === 1 ? d1 : d0
  const feriadosFechas = feriados.map((f) => startOfDayLocal(toDate(f.fecha)))

  let count = 0
  const cursor = new Date(start.getTime())
  cursor.setDate(cursor.getDate() + 1) // exclusivo en `desde`
  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getDay() // 0=domingo, 6=sábado
    const esFinDeSemana = day === 0 || day === 6
    const esFeriado = feriadosFechas.some((f) => sameYmd(cursor, f))
    if (!esFinDeSemana && !esFeriado) count++
    cursor.setDate(cursor.getDate() + 1)
  }

  return direction * count
}

/**
 * True si entre `desde` y `ahora` han transcurrido más de `limite` días hábiles.
 * Útil para decidir si una NC excepcional aún está dentro del plazo.
 */
export function plazoDiasHabilesVencido(
  desde: Date | string,
  limite: number,
  feriados: FeriadoLike[] = [],
  ahora: Date = new Date(),
): boolean {
  const habilesTranscurridos = diasHabilesEntre(desde, ahora, feriados)
  return habilesTranscurridos > limite
}
