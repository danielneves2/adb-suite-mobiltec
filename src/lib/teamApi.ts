// Cliente da API do time (server/ na Vercel). fetch injetável nos testes.
import type { Command } from './catalogTypes'
import { toPayload } from './sync'

export class TeamApiError extends Error {
  constructor(
    message: string,
    /** true = não chegou no servidor (sem internet, servidor fora). */
    readonly offline: boolean,
  ) {
    super(message)
    this.name = 'TeamApiError'
  }
}

export interface TeamApi {
  /** Registra o nome do técnico (cria se não existir). */
  enter(name: string): Promise<void>
  /** O que mudou desde `since` (tudo se null), inclusive excluídos. */
  changes(since: string | null): Promise<{ commands: Command[]; serverNow: string }>
  save(c: Command, user: string): Promise<Command>
  remove(id: string, user: string): Promise<Command>
}

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>

export function createTeamApi(baseUrl: string, appKey: string, fetchFn: FetchFn = (u, i) => fetch(u, i)): TeamApi {
  const base = baseUrl.replace(/\/+$/, '')

  async function call<T>(method: string, path: string, opts: { user?: string; body?: unknown } = {}): Promise<T> {
    const headers: Record<string, string> = { 'x-app-key': appKey }
    if (opts.body !== undefined) headers['content-type'] = 'application/json'
    if (opts.user) headers['x-usuario'] = encodeURIComponent(opts.user)
    let res: Response
    try {
      res = await fetchFn(`${base}${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) })
    } catch {
      throw new TeamApiError('Sem conexão com o servidor.', true)
    }
    const data = (await res.json().catch(() => ({}))) as { erro?: string }
    if (!res.ok) throw new TeamApiError(data.erro ?? `Erro do servidor (${res.status}).`, res.status >= 500)
    return data as T
  }

  return {
    async enter(name) {
      await call('POST', '/api/entrar', { body: { nome: name } })
    },
    async changes(since) {
      const q = since ? `?desde=${encodeURIComponent(since)}` : ''
      const r = await call<{ comandos: Command[]; servidor_agora: string }>('GET', `/api/comandos${q}`)
      return { commands: r.comandos, serverNow: r.servidor_agora }
    },
    async save(c, user) {
      return (await call<{ comando: Command }>('PUT', `/api/comandos/${encodeURIComponent(c.id)}`, { user, body: toPayload(c) })).comando
    },
    async remove(id, user) {
      return (await call<{ comando: Command }>('DELETE', `/api/comandos/${encodeURIComponent(id)}`, { user })).comando
    },
  }
}

/** API configurada no build (VITE_API_URL e VITE_APP_KEY); sem elas o app fica só com o catálogo local. */
export function teamApiFromEnv(): TeamApi | null {
  const url = import.meta.env.VITE_API_URL as string | undefined
  const key = import.meta.env.VITE_APP_KEY as string | undefined
  return url && key ? createTeamApi(url, key) : null
}
