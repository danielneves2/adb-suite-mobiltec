// Roda as migrações do banco na ordem: db/schema.sql → db/002_mvp.sql → db/seed.sql (todas idempotentes).
// Uso (na pasta server): node scripts/migrar.mjs   — lê DATABASE_URL do ../.env.local, nunca imprime a URL.
// Usa o Pool (WebSocket) porque cada arquivo tem vários comandos SQL.
import { Pool } from '@neondatabase/serverless'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const env = readFileSync(join(root, '.env.local'), 'utf8').replace(/^﻿/, '')
  const line = env.split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='))
  if (!line) throw new Error('DATABASE_URL não está no .env.local')
  return line.slice('DATABASE_URL='.length).trim().replace(/^"|"$/g, '')
}

const FILES = ['schema.sql', '002_mvp.sql', 'seed.sql']
const pool = new Pool({ connectionString: databaseUrl() })
try {
  for (const f of FILES) {
    await pool.query(readFileSync(join(root, 'db', f), 'utf8'))
    console.log(`✔ ${f}`)
  }
} finally {
  await pool.end()
}
