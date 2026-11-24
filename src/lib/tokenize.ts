export type BuildErrorCode = 'unbalanced-quotes' | 'missing-value' | 'unknown-placeholder' | 'empty'

/** Erro de montagem de comando. `message` é mostrada ao técnico (pt-BR). */
export class BuildError extends Error {
  constructor(
    public code: BuildErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'BuildError'
  }
}

export interface TokenPart {
  text: string
  quoted: boolean
}

/** Um argumento: partes concatenadas, cada uma sabendo se veio entre aspas. */
export type Token = TokenPart[]

/** Uma linha por comando; remove \r, espaços das pontas e linhas vazias. */
export function splitLines(template: string): string[] {
  return template
    .split('\n')
    .map((line) => line.replace(/\r/g, '').trim())
    .filter((line) => line.length > 0)
}

/**
 * Separa uma linha em argumentos como o cmd/argv faria: espaço separa,
 * aspas duplas ou simples agrupam e somem. Barra invertida é literal
 * (caminhos do Windows).
 */
export function tokenize(line: string): Token[] {
  const tokens: Token[] = []
  let current: Token | null = null
  let quote: '"' | "'" | null = null
  let buffer = ''

  const flushPart = (quoted: boolean) => {
    if (buffer.length > 0 || quoted) {
      current ??= []
      current.push({ text: buffer, quoted })
    }
    buffer = ''
  }

  for (const ch of line) {
    if (quote) {
      if (ch === quote) {
        flushPart(true)
        quote = null
      } else {
        buffer += ch
      }
    } else if (ch === '"' || ch === "'") {
      flushPart(false)
      quote = ch
    } else if (ch === ' ' || ch === '\t') {
      flushPart(false)
      if (current) tokens.push(current)
      current = null
    } else {
      buffer += ch
    }
  }

  if (quote) throw new BuildError('unbalanced-quotes', 'Aspas sem fechar no comando.')
  flushPart(false)
  if (current) tokens.push(current)
  return tokens
}
