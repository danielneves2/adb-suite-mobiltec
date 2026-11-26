// Catálogo do time: junta o catálogo embutido com o cache do servidor. Sem I/O.
import type { Command } from './catalogTypes'

export type CommandCache = Record<string, Command>

/** Aplica as linhas do sync (inclusive excluídas, que ficam marcadas). Devolve um objeto novo. */
export function applyChanges(cache: CommandCache, rows: Command[]): CommandCache {
  const next = { ...cache }
  for (const r of rows) next[r.id] = r
  return next
}

/** Embutido na ordem dele (o servidor vence no mesmo id, campos só do embutido ficam), depois os do time. */
export function mergeCatalog(embedded: Command[], cache: CommandCache): Command[] {
  const seen = new Set<string>()
  const out = embedded.map((c) => {
    seen.add(c.id)
    const remote = cache[c.id]
    return remote ? { ...c, ...remote } : c
  })
  for (const c of Object.values(cache)) if (!seen.has(c.id)) out.push(c)
  return out
}

/** Corpo do PUT /api/comandos/:id: só os campos que a API aceita (oficial/autor/data são do servidor). */
export function toPayload(c: Command) {
  return {
    id: c.id,
    categoria: c.categoria,
    nome: c.nome,
    resumo: c.resumo ?? '',
    comando: c.comando,
    parametro: c.parametro ?? null,
    rotulo_parametro: c.rotulo_parametro ?? null,
    exemplo: c.exemplo ?? null,
    atalhos: c.atalhos ?? null,
    escolha: c.escolha ?? null,
    pede_confirmacao: !!c.pede_confirmacao,
    texto_confirmacao: c.texto_confirmacao ?? null,
    gera_arquivo: !!c.gera_arquivo,
    modo: c.modo ?? 'normal',
    comando_parar: c.comando_parar ?? null,
    comando_depois: c.comando_depois ?? null,
    acao_extra: c.acao_extra ?? null,
    texto_sem_resultado: c.texto_sem_resultado ?? null,
  }
}
