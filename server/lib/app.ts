// Uma instância por função (reaproveitada entre chamadas quentes da Vercel).
import { neonDb } from './db.js'
import { createApi } from './handlers.js'

let api: ReturnType<typeof createApi> | null = null

export function getApi() {
  if (!api) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL não configurada na Vercel')
    api = createApi(neonDb(url), process.env.APP_KEY ?? '')
  }
  return api
}

/** Último pedaço do caminho (/api/comandos/<id>). */
export function idFrom(req: Request): string {
  return decodeURIComponent(new URL(req.url).pathname.split('/').filter(Boolean).pop() ?? '')
}
