// Implementação real do Db com o driver HTTP do Neon (uma requisição por consulta, ideal pra função serverless).
import { neon } from '@neondatabase/serverless'
import type { CommandInput, CommandRow, Db } from './handlers.js'

/** Margem do relógio do sync: uma gravação que ainda estava em andamento na hora da leitura entra no próximo sync. */
const SYNC_MARGIN = "interval '10 seconds'"

type Raw = Record<string, unknown>

function toRow(r: Raw): CommandRow {
  const at = r.atualizado_em
  return {
    id: String(r.id),
    categoria: String(r.categoria),
    nome: String(r.nome),
    resumo: String(r.resumo ?? ''),
    comando: String(r.comando),
    parametro: (r.parametro as string | null) ?? null,
    rotulo_parametro: (r.rotulo_parametro as string | null) ?? null,
    exemplo: (r.exemplo as string | null) ?? null,
    atalhos: r.atalhos ?? null,
    escolha: r.escolha ?? null,
    pede_confirmacao: !!r.pede_confirmacao,
    texto_confirmacao: (r.texto_confirmacao as string | null) ?? null,
    gera_arquivo: !!r.gera_arquivo,
    modo: String(r.modo ?? 'normal'),
    comando_parar: (r.comando_parar as string | null) ?? null,
    comando_depois: (r.comando_depois as string | null) ?? null,
    acao_extra: (r.acao_extra as string | null) ?? null,
    texto_sem_resultado: (r.texto_sem_resultado as string | null) ?? null,
    oficial: !!r.oficial,
    excluido: !!r.excluido,
    atualizado_em: at instanceof Date ? at.toISOString() : new Date(String(at)).toISOString(),
    autor: (r.autor as string | null) ?? null,
  }
}

const SELECT = `
  select c.*, coalesce(ua.nome, uc.nome) as autor
  from comandos c
  left join usuarios ua on ua.id = c.atualizado_por
  left join usuarios uc on uc.id = c.criado_por`

export function neonDb(databaseUrl: string): Db {
  const sql = neon(databaseUrl)
  const byId = async (id: string): Promise<CommandRow | null> => {
    const rows = (await sql.query(`${SELECT} where c.id = $1`, [id])) as Raw[]
    return rows[0] ? toRow(rows[0]) : null
  }

  return {
    async ensureUser(nome) {
      const rows = (await sql.query(
        'insert into usuarios (nome) values ($1) on conflict ((lower(nome))) do update set nome = usuarios.nome returning id, nome',
        [nome],
      )) as Raw[]
      return { id: String(rows[0].id), nome: String(rows[0].nome) }
    },

    async changesSince(since) {
      // O relógio vem ANTES da leitura: nada gravado entre os dois passos fica de fora do próximo sync.
      const [{ agora }] = (await sql.query(`select (now() - ${SYNC_MARGIN}) as agora`)) as Raw[]
      const rows = (await sql.query(`${SELECT} where ($1::timestamptz is null or c.atualizado_em > $1) order by c.atualizado_em`, [since?.toISOString() ?? null])) as Raw[]
      return { rows: rows.map(toRow), now: new Date(String(agora instanceof Date ? agora.toISOString() : agora)).toISOString() }
    },

    async upsertCommand(c: CommandInput, userId) {
      await sql.query(
        `insert into comandos (id, categoria, nome, resumo, comando, parametro, rotulo_parametro, exemplo, atalhos, escolha,
           pede_confirmacao, texto_confirmacao, gera_arquivo, modo, comando_parar, comando_depois, acao_extra, texto_sem_resultado,
           oficial, criado_por, atualizado_por, excluido)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, $18, false, $19, $19, false)
         on conflict (id) do update set
           categoria = excluded.categoria, nome = excluded.nome, resumo = excluded.resumo, comando = excluded.comando,
           parametro = excluded.parametro, rotulo_parametro = excluded.rotulo_parametro, exemplo = excluded.exemplo,
           atalhos = excluded.atalhos, escolha = excluded.escolha, pede_confirmacao = excluded.pede_confirmacao,
           texto_confirmacao = excluded.texto_confirmacao, gera_arquivo = excluded.gera_arquivo, modo = excluded.modo,
           comando_parar = excluded.comando_parar, comando_depois = excluded.comando_depois, acao_extra = excluded.acao_extra,
           texto_sem_resultado = excluded.texto_sem_resultado, atualizado_por = excluded.atualizado_por, excluido = false`,
        [
          c.id, c.categoria, c.nome, c.resumo, c.comando, c.parametro, c.rotulo_parametro, c.exemplo,
          c.atalhos === null ? null : JSON.stringify(c.atalhos), c.escolha === null ? null : JSON.stringify(c.escolha),
          c.pede_confirmacao, c.texto_confirmacao, c.gera_arquivo, c.modo, c.comando_parar, c.comando_depois, c.acao_extra,
          c.texto_sem_resultado, userId,
        ],
      )
      const row = await byId(c.id)
      if (!row) throw new Error(`comando ${c.id} sumiu depois de salvar`)
      return row
    },

    async listUsers() {
      const rows = (await sql.query('select nome from usuarios order by lower(nome)')) as Raw[]
      return rows.map((r) => String(r.nome))
    },

    async softDelete(id, userId) {
      const updated = (await sql.query('update comandos set excluido = true, atualizado_por = $2 where id = $1 returning id', [id, userId])) as Raw[]
      return updated.length ? byId(id) : null
    },
  }
}
