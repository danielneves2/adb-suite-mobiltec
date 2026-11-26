// Regras da API (sem I/O): chave do app, nome do técnico, validação e códigos HTTP. O banco entra pela interface Db.
import { z } from 'zod'

export interface CommandRow {
  id: string
  categoria: string
  nome: string
  resumo: string
  comando: string
  parametro: string | null
  rotulo_parametro: string | null
  exemplo: string | null
  atalhos: unknown
  escolha: unknown
  pede_confirmacao: boolean
  texto_confirmacao: string | null
  gera_arquivo: boolean
  modo: string
  comando_parar: string | null
  comando_depois: string | null
  acao_extra: string | null
  texto_sem_resultado: string | null
  oficial: boolean
  excluido: boolean
  /** ISO 8601 */
  atualizado_em: string
  /** Nome de quem editou por último (ou criou). */
  autor: string | null
}

export type CommandInput = z.infer<typeof commandSchema>

export interface Db {
  /** Acha o usuário pelo nome (sem diferenciar maiúsculas) ou cria. */
  ensureUser(nome: string): Promise<{ id: string; nome: string }>
  /** Linhas com atualizado_em > since (todas se null), inclusive excluídas, e o relógio do servidor. */
  changesSince(since: Date | null): Promise<{ rows: CommandRow[]; now: string }>
  /** Cria ou atualiza (nunca muda `oficial`; criado_por só na criação). */
  upsertCommand(c: CommandInput, userId: string): Promise<CommandRow>
  /** excluido = true; null se o id não existe. */
  softDelete(id: string, userId: string): Promise<CommandRow | null>
}

const NAME_CHARS = /^[\p{L}\s.'-]+$/u

/** Mesma regra da tela de entrada do app (src/lib/user.ts). */
export function validateUserName(raw: string): string | null {
  const name = raw.trim()
  if (!name) return 'Digite seu nome.'
  if (name.length < 2) return 'Use pelo menos 2 letras.'
  if (name.length > 40) return 'Use no máximo 40 caracteres.'
  if (!NAME_CHARS.test(name)) return 'Use só letras, espaços, ponto, hífen e apóstrofo.'
  return null
}

const optionalText = z.string().max(2000).nullable().optional().default(null)
const commandLines = z
  .string()
  .max(4000)
  .refine((s) => s.split(/\r?\n/).some((l) => l.trim()), 'Escreve o comando adb.')
  .refine((s) => s.split(/\r?\n/).filter((l) => l.trim()).every((l) => /^adb(\.exe)?\s/i.test(l.trim())), 'Cada linha precisa começar com adb.')

export const commandSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/, 'Id inválido.'),
  categoria: z.string().trim().min(1, 'Dá um nome pra categoria.').max(24, 'Nome da categoria com no máximo 24 caracteres.'),
  nome: z.string().trim().min(1, 'Dá um nome pro comando.').max(80),
  resumo: z.string().trim().max(500).default(''),
  comando: commandLines,
  parametro: z.enum(['pkg', 'apk', 'file', 'path', 'text']).nullable().default(null),
  rotulo_parametro: optionalText,
  exemplo: optionalText,
  atalhos: z.array(z.object({ rotulo: z.string(), valor: z.string() })).nullable().optional().default(null),
  escolha: z.object({ pergunta: z.string(), opcao_outro: z.string().nullable() }).nullable().optional().default(null),
  pede_confirmacao: z.boolean().default(false),
  texto_confirmacao: optionalText,
  gera_arquivo: z.boolean().default(false),
  modo: z.enum(['normal', 'continuo', 'terminal', 'vigiar_prints']).default('normal'),
  comando_parar: optionalText,
  comando_depois: optionalText,
  acao_extra: z.enum(['copiar_imagem', 'zipar']).nullable().optional().default(null),
  texto_sem_resultado: optionalText,
})

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

// O app chama de dentro da janela do Tauri (outra origem): sem CORS o navegador embutido bloqueia.
// "*" é aceito: a chave do app vai no cabeçalho, não em cookie.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, x-app-key, x-usuario',
  'access-control-max-age': '86400',
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

/** Resposta à pré-verificação (OPTIONS) do navegador. */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS })
}

function checkKey(req: Request, appKey: string) {
  if (!appKey || req.headers.get('x-app-key') !== appKey) throw new HttpError(401, 'Chave do app inválida.')
}

/** X-Usuario vem com encodeURIComponent (cabeçalho HTTP não aceita acento direto). */
function userFrom(req: Request): string {
  const raw = req.headers.get('x-usuario')
  if (!raw) throw new HttpError(400, 'Falta o nome do técnico (X-Usuario).')
  let name: string
  try {
    name = decodeURIComponent(raw).trim()
  } catch {
    throw new HttpError(400, 'Nome do técnico inválido.')
  }
  const problem = validateUserName(name)
  if (problem) throw new HttpError(400, problem)
  return name
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new HttpError(400, 'Corpo da requisição não é JSON.')
  }
}

function firstIssue(e: z.ZodError): string {
  return e.issues[0]?.message ?? 'Dados inválidos.'
}

async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { erro: e.message })
    console.error(e) // log da Vercel; o cliente não vê detalhe do banco
    return json(500, { erro: 'Erro no servidor. Tente de novo.' })
  }
}

export function createApi(db: Db, appKey: string) {
  return {
    entrar: (req: Request) =>
      handle(async () => {
        checkKey(req, appKey)
        const body = (await readJson(req)) as { nome?: unknown }
        const nome = typeof body?.nome === 'string' ? body.nome.trim() : ''
        const problem = validateUserName(nome)
        if (problem) throw new HttpError(400, problem)
        return json(200, { usuario: await db.ensureUser(nome) })
      }),

    listar: (req: Request) =>
      handle(async () => {
        checkKey(req, appKey)
        const desde = new URL(req.url).searchParams.get('desde')
        let since: Date | null = null
        if (desde) {
          since = new Date(desde)
          if (Number.isNaN(since.getTime())) throw new HttpError(400, 'Parâmetro desde inválido (use data ISO).')
        }
        const { rows, now } = await db.changesSince(since)
        return json(200, { comandos: rows, servidor_agora: now })
      }),

    salvar: (req: Request, id: string) =>
      handle(async () => {
        checkKey(req, appKey)
        const nome = userFrom(req)
        const parsed = commandSchema.safeParse(await readJson(req))
        if (!parsed.success) throw new HttpError(400, firstIssue(parsed.error))
        if (parsed.data.id !== id) throw new HttpError(400, 'O id da URL é diferente do id do comando.')
        const user = await db.ensureUser(nome)
        return json(200, { comando: await db.upsertCommand(parsed.data, user.id) })
      }),

    excluir: (req: Request, id: string) =>
      handle(async () => {
        checkKey(req, appKey)
        const nome = userFrom(req)
        const user = await db.ensureUser(nome)
        const row = await db.softDelete(id, user.id)
        if (!row) throw new HttpError(404, 'Comando não encontrado.')
        return json(200, { comando: row })
      }),
  }
}
