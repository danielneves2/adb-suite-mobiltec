// Usuário do app: só o nome (sem senha). Vai no cabeçalho X-Usuario quando a sincronização chegar.

const ALLOWED = /^[\p{L}\s.'-]+$/u

export function validateUserName(raw: string): string | null {
  const name = raw.trim()
  if (!name) return 'Digite seu nome.'
  if (name.length < 2) return 'Use pelo menos 2 letras.'
  if (name.length > 40) return 'Use no máximo 40 caracteres.'
  if (!ALLOWED.test(name)) return 'Use só letras, espaços, ponto, hífen e apóstrofo.'
  return null
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}
