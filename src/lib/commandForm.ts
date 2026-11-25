// Formulário "Novo comando / Editar comando": validação, conversão e prévia. Sem I/O.
import type { Command, ParamKind } from './catalogTypes'
import { buildCommand } from './commandBuilder'

export interface CommandFormData {
  nome: string
  categoria: string
  resumo: string
  comando: string
  parametro: ParamKind | null
  pede_confirmacao: boolean
}

export const MY_CATEGORY = 'Meus comandos'

/** Ordem do select de categoria (referência de UI, seção 7). */
export const FORM_CATEGORIES = [MY_CATEGORY, 'Apps', 'Pacotes', 'Telas', 'Controle', 'Aparelho', 'Captura', 'Logs', 'Arquivos', 'Conexão']

export const OTHER_CATEGORY = 'Outros'

/** Marcadores que o formulário oferece como botões, com o tipo de valor que cada um pede. */
export const PLACEHOLDERS: { token: string; kind: ParamKind | null; hint: string }[] = [
  { token: '{pacote}', kind: 'pkg', hint: 'pacote do app' },
  { token: '{arquivo}', kind: 'file', hint: 'arquivo do computador' },
  { token: '{caminho}', kind: 'path', hint: 'caminho no aparelho' },
  { token: '{texto}', kind: 'text', hint: 'texto livre' },
  { token: '{d}', kind: null, hint: 'pasta de saída do aparelho' },
  { token: '{agora}', kind: null, hint: 'data e hora (AAAAMMDD_HHMM)' },
]

export function paramForPlaceholder(token: string): ParamKind | null {
  return PLACEHOLDERS.find((p) => p.token === token)?.kind ?? null
}

/** Insere `insert` no lugar da seleção [start, end) e devolve o texto e a posição do cursor depois. */
export function insertAt(text: string, start: number, end: number, insert: string): { text: string; cursor: number } {
  return { text: text.slice(0, start) + insert + text.slice(end), cursor: start + insert.length }
}

const VALUE_TOKENS = /\{(p|pacote|arquivo|caminho|texto|pasta)\}/

/** Fixas, depois as criadas pelo técnico (sem repetir, sem diferenciar maiúsculas) e "Outros" no fim. */
export function categoryOptions(custom: string[]): string[] {
  const out = [...FORM_CATEGORIES]
  const seen = new Set(out.map((c) => c.toLowerCase()))
  seen.add(OTHER_CATEGORY.toLowerCase())
  for (const c of custom) {
    const k = c.trim().toLowerCase()
    if (k && !seen.has(k)) {
      seen.add(k)
      out.push(c.trim())
    }
  }
  return [...out, OTHER_CATEGORY]
}

/** Categoria digitada: se já existe (sem diferenciar maiúsculas), usa a grafia existente. */
export function normalizeCategory(typed: string, existing: string[]): string {
  const t = typed.trim()
  return categoryOptions(existing).find((c) => c.toLowerCase() === t.toLowerCase()) ?? t
}

export const PARAM_OPTIONS: { value: ParamKind | null; label: string }[] = [
  { value: null, label: 'Nada, roda direto' },
  { value: 'pkg', label: 'Um pacote de app' },
  { value: 'file', label: 'Um arquivo do computador' },
  { value: 'path', label: 'Um caminho no aparelho' },
  { value: 'text', label: 'Um texto livre' },
]

/** Valor de exemplo de cada tipo (placeholder do campo e prévia). */
export const EXAMPLE_VALUE: Record<ParamKind, string> = {
  pkg: 'br.com.mobiltec.c4m.android.agent',
  apk: 'C:\\adb\\c4magent.apk',
  file: 'C:\\adb\\arquivo.txt',
  path: '/sdcard/Download/arquivo.txt',
  text: 'digite o valor',
}

export const EMPTY_FORM: CommandFormData = { nome: '', categoria: MY_CATEGORY, resumo: '', comando: '', parametro: null, pede_confirmacao: false }

const lines = (cmd: string) => cmd.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

/** Primeiro erro do formulário (na ordem da referência), ou null se está tudo certo. */
export function validateCommandForm(f: CommandFormData): string | null {
  if (!f.nome.trim()) return 'Dá um nome pro comando.'
  if (!f.categoria.trim()) return 'Dá um nome pra categoria.'
  if (f.categoria.trim().length > 24) return 'Nome da categoria com no máximo 24 caracteres.'
  const ls = lines(f.comando)
  if (ls.length === 0) return 'Escreve o comando adb.'
  if (!ls.every((l) => /^adb(\.exe)?\s/i.test(l))) return 'Cada linha precisa começar com adb.'
  const usesValue = VALUE_TOKENS.exec(ls.join('\n'))
  if (usesValue && f.parametro === null) return `O comando usa ${usesValue[0]}: escolha em “O comando pede” o tipo do valor.`
  try {
    buildCommand(ls.join('\n'), { serial: 'X', value: 'valor', deviceDir: 'C:\\x', now: new Date() }, {})
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
  return null
}

export function formToCommand(f: CommandFormData, id: string, now: Date, autor: string | null = null): Command {
  const comando = lines(f.comando).join('\n')
  return {
    id,
    categoria: f.categoria.trim(),
    nome: f.nome.trim(),
    resumo: f.resumo.trim(),
    comando,
    parametro: f.parametro,
    pede_confirmacao: f.pede_confirmacao,
    texto_confirmacao: null,
    gera_arquivo: comando.includes('{d}'),
    modo: 'normal',
    oficial: false,
    excluido: false,
    atualizado_em: now.toISOString(),
    autor,
  }
}

export function commandToForm(c: Command): CommandFormData {
  return {
    nome: c.nome,
    categoria: c.categoria,
    resumo: c.resumo,
    comando: c.comando,
    parametro: c.parametro,
    pede_confirmacao: !!c.pede_confirmacao,
  }
}

/** "Salvar como comando": o comando do time não leva `-s`, o app injeta o aparelho na hora. */
export function stripSerial(display: string): string {
  return display.replace(/^adb -s \S+ /gm, 'adb ')
}

/** Linhas da prévia, como vão rodar no aparelho selecionado. Se ainda não monta, mostra o texto cru. */
export function previewLines(f: CommandFormData, serial: string, deviceDir: string): string[] {
  const text = lines(f.comando).join('\n')
  if (!text) return [`adb -s ${serial} …`]
  try {
    const value = EXAMPLE_VALUE[f.parametro ?? 'text']
    return buildCommand(text, { serial, value, deviceDir, now: new Date() }, { allowEmptyValue: true }).display.split('\n')
  } catch {
    return text.split('\n')
  }
}
