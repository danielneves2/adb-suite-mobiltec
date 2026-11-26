import { getApi } from '../lib/app.js'
import { preflight } from '../lib/handlers.js'

export function POST(req: Request) {
  return getApi().entrar(req)
}

export function OPTIONS() {
  return preflight()
}
