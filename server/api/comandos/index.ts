import { getApi } from '../../lib/app.js'

export function GET(req: Request) {
  return getApi().listar(req)
}
