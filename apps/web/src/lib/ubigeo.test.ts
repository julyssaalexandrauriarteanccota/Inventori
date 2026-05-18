 import { describe, expect, it } from 'vitest'

import {
  DEFAULT_UBIGEO_SELECTION,
  getCanonicalUbigeoSelection,
  getDepartamentos,
  getDistritosByDepartamentoAndProvinciaName,
  getProvinciasByDepartamentoName,
} from '@/lib/ubigeo'

describe('ubigeo helpers', () => {
  it('expone el ubigeo por defecto de Puno', () => {
    expect(DEFAULT_UBIGEO_SELECTION).toEqual({
      departamento: 'Puno',
      provincia: 'Puno',
      distrito: 'Puno',
    })
  })

  it('devuelve provincias y distritos filtrados por cascada', () => {
    expect(getProvinciasByDepartamentoName('Puno').some((item) => item.name === 'Puno')).toBe(true)
    expect(
      getDistritosByDepartamentoAndProvinciaName('Puno', 'Puno').some(
        (item) => item.name === 'Puno',
      ),
    ).toBe(true)
  })

  it('normaliza valores existentes al formato visible del selector', () => {
    expect(
      getCanonicalUbigeoSelection({
        departamento: 'PUNO',
        provincia: 'PUNO',
        distrito: 'PUNO',
      }),
    ).toEqual({
      departamento: 'Puno',
      provincia: 'Puno',
      distrito: 'Puno',
    })
  })

  it('incluye el catalogo completo de departamentos del Peru', () => {
    expect(getDepartamentos()).toHaveLength(25)
  })
})
