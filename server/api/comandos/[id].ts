import { getApi, idFrom } from '../../lib/app.js'

export function PUT(req: Request) {
  return getApi().salvar(req, idFrom(req))
}

export function DELETE(req: Request) {
  return getApi().excluir(req, idFrom(req))
}
