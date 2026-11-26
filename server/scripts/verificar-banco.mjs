// Só LEITURA: mostra o estado do banco antes de rodar migração (tabelas, colunas, contagens, nomes repetidos).
// Uso (na pasta server): node scripts/verificar-banco.mjs   — lê DATABASE_URL do ../.env.local, nunca imprime a URL.
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const env = readFileSync(join(here, '..', '..', '.env.local'), 'utf8').replace(/^﻿/, '') // salvo pelo Windows com BOM
  const line = env.split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='))
  if (!line) throw new Error('DATABASE_URL não está no .env.local')
  return line.slice('DATABASE_URL='.length).trim().replace(/^"|"$/g, '')
}

const sql = neon(databaseUrl())
const tables = (await sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`).map((r) => r.table_name)
console.log('tabelas:', tables.join(', ') || '(nenhuma)')

for (const t of ['usuarios', 'comandos']) {
  if (!tables.includes(t)) continue
  const cols = (await sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = ${t} order by ordinal_position`).map((r) => r.column_name)
  console.log(`${t}:`, cols.join(', '))
}

if (tables.includes('usuarios')) {
  const [{ n }] = await sql`select count(*)::int as n from usuarios`
  const dups = await sql`select lower(nome) as nome, count(*)::int as n from usuarios group by 1 having count(*) > 1`
  console.log(`usuarios: ${n} (nomes repetidos sem diferenciar maiúsculas: ${dups.length ? dups.map((d) => `${d.nome}×${d.n}`).join(', ') : 'nenhum'})`)
}

if (tables.includes('comandos')) {
  const [c] = await sql`select count(*)::int as total, count(*) filter (where oficial)::int as oficiais, count(*) filter (where excluido)::int as excluidos, count(*) filter (where atualizado_por is not null)::int as editados from comandos`
  console.log(`comandos: ${c.total} (oficiais ${c.oficiais}, excluídos ${c.excluidos}, editados pelo time ${c.editados})`)
  const foco = await sql`select comando from comandos where id = 'foco'`
  console.log('foco:', foco[0]?.comando ?? '(não existe)')
}
