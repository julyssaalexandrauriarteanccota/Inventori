import { describe, expect, it } from 'vitest'
import {
  diasHabilesEntre,
  plazoDiasHabilesVencido,
} from './dias-habiles.type'

describe('diasHabilesEntre', () => {
  it('cuenta cero días entre la misma fecha', () => {
    expect(diasHabilesEntre('2026-05-06', '2026-05-06')).toBe(0)
  })

  it('cuenta 5 días hábiles en una semana laboral completa (lun→lun)', () => {
    // Lunes 4 mayo 2026 → Lunes 11 mayo 2026 = 5 días hábiles (mar,mié,jue,vie,lun)
    expect(diasHabilesEntre('2026-05-04', '2026-05-11')).toBe(5)
  })

  it('omite sábado y domingo', () => {
    // Viernes 8 → Lunes 11 = 1 día hábil (lunes), no 3
    expect(diasHabilesEntre('2026-05-08', '2026-05-11')).toBe(1)
  })

  it('omite feriados', () => {
    // Viernes 8 → Miércoles 13, con feriado el martes 12
    const feriados = [{ fecha: new Date('2026-05-12T00:00:00') }]
    // Sin feriado: lunes,mar,mié = 3 días. Con feriado mar: lunes,mié = 2.
    expect(diasHabilesEntre('2026-05-08', '2026-05-13', feriados)).toBe(2)
  })

  it('devuelve negativo si hasta < desde', () => {
    expect(diasHabilesEntre('2026-05-11', '2026-05-04')).toBe(-5)
  })

  it('cuenta 10 días hábiles ignorando dos fines de semana', () => {
    // Lunes 4 mayo → Lunes 18 mayo = 10 días hábiles
    expect(diasHabilesEntre('2026-05-04', '2026-05-18')).toBe(10)
  })
})

describe('plazoDiasHabilesVencido', () => {
  it('false si aún no se cumplen los días hábiles límite', () => {
    // 5 días después de un lunes a las 12pm: vie de la misma semana → 4 hábiles
    expect(
      plazoDiasHabilesVencido('2026-05-04', 10, [], new Date('2026-05-08')),
    ).toBe(false)
  })

  it('true si excede el límite', () => {
    // Lunes → 3 semanas después = 15 días hábiles, > 10
    expect(
      plazoDiasHabilesVencido('2026-05-04', 10, [], new Date('2026-05-25')),
    ).toBe(true)
  })

  it('respeta feriados al calcular si está vencido', () => {
    // 11 días calendario → si hay 2 feriados en medio bajan a 9 hábiles, no vencido
    const feriados = [
      { fecha: new Date('2026-05-11T00:00:00') },
      { fecha: new Date('2026-05-13T00:00:00') },
    ]
    expect(
      plazoDiasHabilesVencido(
        '2026-05-04',
        10,
        feriados,
        new Date('2026-05-19'),
      ),
    ).toBe(false)
  })
})
