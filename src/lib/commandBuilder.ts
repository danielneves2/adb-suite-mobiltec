import { BuildError, splitLines, tokenize, type Token } from './tokenize'

export interface BuildContext {
  serial: string
  value?: string
  deviceDir: string
  now: Date
}

/** Um passo pro executor: args SEM o executável `adb`. */
export interface Step {
  args: string[]
  redirectTo?: string
  usesPrevious: boolean
}

export interface BuildResult {
  steps: Step[]
  /** Texto legível pro "Ver comando adb", uma linha por passo. */
  display: string
}

export interface BuildOptions {
  requiresValue?: boolean
  /** Comando livre: chaves ficam literais. */
  freeMode?: boolean
}

export const NO_SERIAL_SUBCOMMANDS: readonly string[] = ['devices', 'kill-server', 'start-server', 'connect', 'disconnect', 'version']

const ADB_EXECUTABLES = new Set(['adb', 'adb.exe', '.\\adb', './adb', '.\\adb.exe', './adb.exe'])
const VALUE_PLACEHOLDERS = new Set(['p', 'pacote', 'arquivo', 'caminho', 'texto', 'pasta'])
const KNOWN_PLACEHOLDERS = new Set([...VALUE_PLACEHOLDERS, 's', 'd', 'agora', 'anterior'])
const DEVICE_SHELL_SUBCOMMANDS = new Set(['shell', 'exec-out'])
const PLACEHOLDER_RE = /\{([a-z_]+)\}/g
const SHELL_SAFE_RE = /^[A-Za-z0-9._\-/:=@%+,]+$/
const DISPLAY_NEEDS_QUOTES_RE = /[\s|'$;>&"<]/

const pad = (n: number) => String(n).padStart(2, '0')

/** `AAAAMMDD_HHMM` no horário local (padrão de nome de log do time). */
export function formatTimestamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}

/** Aspas simples de sh: o valor chega como uma palavra só na shell do aparelho. */
function shQuote(value: string): string {
  return SHELL_SAFE_RE.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`
}

const joinToken = (t: Token) => t.map((p) => p.text).join('')
const isBareText = (t: Token, text: string) => t.length === 1 && !t[0].quoted && t[0].text === text

export function buildCommand(template: string, ctx: BuildContext, opts: BuildOptions = {}): BuildResult {
  const lines = splitLines(template)
  if (lines.length === 0) throw new BuildError('empty', 'Comando vazio.')

  const value = (ctx.value ?? '').trim()
  if (!opts.freeMode) {
    const usesValue = [...template.matchAll(PLACEHOLDER_RE)].some((m) => VALUE_PLACEHOLDERS.has(m[1]))
    if ((opts.requiresValue || usesValue) && value === '') {
      throw new BuildError('missing-value', 'Preencha o valor antes de executar.')
    }
  }

  const steps = lines.map((line) => buildLine(line, ctx, value, opts.freeMode === true))
  return { steps, display: steps.map(displayStep).join('\n') }
}

function buildLine(line: string, ctx: BuildContext, value: string, freeMode: boolean): Step {
  let tokens = tokenize(line)
  if (tokens.length > 0 && ADB_EXECUTABLES.has(joinToken(tokens[0]).toLowerCase())) tokens = tokens.slice(1)

  let redirectToken: Token | undefined
  if (tokens.length >= 2 && isBareText(tokens[tokens.length - 2], '>')) {
    redirectToken = tokens[tokens.length - 1]
    tokens = tokens.slice(0, -2)
  }

  let usesPrevious = false
  let inDeviceShell = false

  const substitute = (token: Token, deviceShell: boolean): string =>
    token
      .map((part) => {
        if (freeMode) return part.text
        return part.text.replace(PLACEHOLDER_RE, (whole, name: string) => {
          if (!KNOWN_PLACEHOLDERS.has(name)) throw new BuildError('unknown-placeholder', `Marcador desconhecido: ${whole}.`)
          if (name === 's') return ctx.serial
          if (name === 'd') return ctx.deviceDir
          if (name === 'agora') return formatTimestamp(ctx.now)
          if (name === 'anterior') {
            usesPrevious = true
            return whole
          }
          return deviceShell && part.quoted ? shQuote(value) : value
        })
      })
      .join('')

  const args: string[] = []
  for (const token of tokens) {
    args.push(substitute(token, inDeviceShell))
    if (!inDeviceShell && token.length === 1 && !token[0].quoted && DEVICE_SHELL_SUBCOMMANDS.has(token[0].text)) {
      inDeviceShell = true
    }
  }

  if (args[0] === '-s') {
    if (args.length >= 2) args[1] = ctx.serial
    else args.push(ctx.serial)
  } else if (!(args.length > 0 && NO_SERIAL_SUBCOMMANDS.includes(args[0]))) {
    args.unshift('-s', ctx.serial)
  }

  const step: Step = { args, usesPrevious }
  if (redirectToken) step.redirectTo = substitute(redirectToken, false)
  return step
}

const displayArg = (a: string) => (a === '' || DISPLAY_NEEDS_QUOTES_RE.test(a) ? `"${a}"` : a)

function displayStep(step: Step): string {
  const base = ['adb', ...step.args.map(displayArg)].join(' ')
  return step.redirectTo !== undefined ? `${base} > ${displayArg(step.redirectTo)}` : base
}
