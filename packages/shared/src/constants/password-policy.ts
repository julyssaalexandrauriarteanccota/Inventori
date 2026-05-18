export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?'

export const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,}$/

export const PASSWORD_POLICY_MESSAGE =
  'La contrasena debe tener al menos 8 caracteres e incluir mayuscula, minuscula, numero y simbolo, sin espacios.'

export const PASSWORD_REQUIREMENTS_TEXT =
  'Minimo 8 caracteres con mayuscula, minuscula, numero y simbolo.'

export function isSecurePassword(password: string) {
  return PASSWORD_POLICY_REGEX.test(password)
}
