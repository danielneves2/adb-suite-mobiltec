import { getApi } from '../../lib/app.js'
import { preflight } from '../../lib/handlers.js'

export function GET(req: Request) {
  return getApi().listar(req)
}

export function OPTIONS() {
  return preflight()
}
