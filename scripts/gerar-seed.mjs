// Gera db/seed.sql a partir de data/catalog.json.
// Uso: node scripts/gerar-seed.mjs
// O seed usa "on conflict (id) do nothing": rodar de novo nunca sobrescreve edição do time.
// Correção num comando oficial já publicado vai como migração explícita (update ... where id = ...).
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(readFileSync(join(root, 'data', 'catalog.json'), 'utf8'))

const COLUMNS = [
  'id', 'categoria', 'nome', 'resumo', 'comando', 'parametro', 'rotulo_parametro', 'exemplo',
  'atalhos', 'escolha', 'pede_confirmacao', 'texto_confirmacao', 'gera_arquivo',
  'modo', 'comando_parar', 'comando_depois', 'acao_extra', 'texto_sem_resultado', 'oficial',
]
const JSONB = new Set(['atalhos', 'escolha'])
const BOOLEAN_DEFAULT_FALSE = new Set(['pede_confirmacao', 'gera_arquivo'])

const text = (v) => `'${String(v).replace(/'/g, "''")}'`

function literal(column, command) {
  if (column === 'oficial') return 'true'
  if (column === 'modo') return text(command.modo ?? 'normal')
  const v = command[column]
  if (BOOLEAN_DEFAULT_FALSE.has(column)) return v ? 'true' : 'false'
  if (v === undefined || v === null) return 'null'
  if (JSONB.has(column)) return `${text(JSON.stringify(v))}::jsonb`
  return text(v)
}

const rows = catalog.comandos.map((c) => `  (${COLUMNS.map((col) => literal(col, c)).join(', ')})`)

const sql = [
  `-- Catálogo oficial (gerado por scripts/gerar-seed.mjs a partir de data/catalog.json v${catalog.versao}). Não edite à mão.`,
  '-- Rodar depois de schema.sql e 002_mvp.sql. Pode rodar de novo: não duplica nem sobrescreve edições do time.',
  `insert into comandos (${COLUMNS.join(', ')}) values`,
  rows.join(',\n'),
  'on conflict (id) do nothing;',
  '',
].join('\n')

writeFileSync(join(root, 'db', 'seed.sql'), sql)
console.log(`seed.sql gerado: ${rows.length} comandos`)
