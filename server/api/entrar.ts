import { getApi } from '../lib/app.js'

export function POST(req: Request) {
  return getApi().entrar(req)
}
