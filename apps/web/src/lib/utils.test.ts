import { cn } from './utils'

describe('cn', () => {
  it('combina clases simples y omite valores falsy', () => {
    expect(cn('text-sm', false && 'hidden', undefined, 'font-medium')).toBe(
      'text-sm font-medium',
    )
  })

  it('resuelve conflictos de Tailwind conservando la ultima clase', () => {
    expect(cn('px-2', 'text-sm', 'px-4')).toBe('text-sm px-4')
  })
})
