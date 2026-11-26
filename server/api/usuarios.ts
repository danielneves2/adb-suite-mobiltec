import { getApi } from '../lib/app.js'
import { preflight } from '../lib/handlers.js'

export function GET(req: Request) {
  return getApi().usuarios(req)
}

export function OPTIONS() {
  return preflight()
}
