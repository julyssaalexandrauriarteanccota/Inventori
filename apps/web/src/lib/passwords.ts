import { PASSWORD_SYMBOLS } from '@erp/shared'

const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const ALL = `${LOWER}${UPPER}${DIGITS}${PASSWORD_SYMBOLS}`

function randomIndex(max: number) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    return values[0] % max
  }

  return Math.floor(Math.random() * max)
}

function takeRandom(chars: string) {
  return chars[randomIndex(chars.length)]
}

function shuffle(chars: string[]) {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars
}

export function generateSecurePassword(length = 14) {
  const safeLength = Math.max(length, 8)
  const chars = [
    takeRandom(LOWER),
    takeRandom(UPPER),
    takeRandom(DIGITS),
    takeRandom(PASSWORD_SYMBOLS),
  ]

  while (chars.length < safeLength) {
    chars.push(takeRandom(ALL))
  }

  return shuffle(chars).join('')
}
