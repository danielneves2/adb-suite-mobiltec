import { describe, expect, test, vi } from 'vitest'
import { createApi, type CommandRow, type Db } from './handlers.js'

const KEY = 'chave-teste'
const row = (over: Partial<CommandRow> = {}): CommandRow => ({
  id: 'local-1',
  categoria: 'Rede',
  nome: 'Abrir Wi-Fi',
  resumo: '',
  comando: 'adb shell am start -a android.settings.WIFI_SETTINGS',
  parametro: null,
  rotulo_parametro: null,
  exemplo: null,
  atalhos: null,
  escolha: null,
  pede_confirmacao: false,
  texto_confirmacao: null,
  gera_arquivo: false,
  modo: 'normal',
  comando_parar: null,
  comando_depois: null,
  acao_extra: null,
  texto_sem_resultado: null,
  oficial: false,
  excluido: false,
  atualizado_em: '2026-11-26T15:00:00.000Z',
  autor: 'João',
  ...over,
})

function fakeDb(over: Partial<Db> = {}): Db {
  return {
    ensureUser: vi.fn(async (nome: string) => ({ id: 'u1', nome })),
    changesSince: vi.fn(async () => ({ rows: [row()], now: '2026-11-26T15:00:00.000Z' })),
    upsertCommand: vi.fn(async (c) => row({ ...c, autor: 'João' })),
    softDelete: vi.fn(async (id: string) => row({ id, excluido: true })),
    ...over,
  }
}

const req = (method: string, path: string, opts: { body?: unknown; key?: string | null; user?: string | null } = {}) => {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (opts.key !== null) headers.set('x-app-key', opts.key ?? KEY)
  if (opts.user !== null) headers.set('x-usuario', encodeURIComponent(opts.user ?? 'João'))
  return new Request(`https://api.test${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) })
}

const body = { id: 'local-1', categoria: 'Rede', nome: 'Abrir Wi-Fi', resumo: '', comando: 'adb shell am start -a android.settings.WIFI_SETTINGS', parametro: null, pede_confirmacao: false }

describe('chave do app', () => {
  test('sem X-App-Key ou com chave errada: 401', async () => {
    const api = createApi(fakeDb(), KEY)
    expect((await api.listar(req('GET', '/api/comandos', { key: null }))).status).toBe(401)
    expect((await api.listar(req('GET', '/api/comandos', { key: 'outra' }))).status).toBe(401)
  })
})

describe('POST /api/entrar', () => {
  test('cria ou acha o usuário pelo nome', async () => {
    const db = fakeDb()
    const res = await createApi(db, KEY).entrar(req('POST', '/api/entrar', { body: { nome: '  João  ' } }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ usuario: { id: 'u1', nome: 'João' } })
    expect(db.ensureUser).toHaveBeenCalledWith('João')
  })

  test('nome inválido: 400 com a mensagem', async () => {
    const res = await createApi(fakeDb(), KEY).entrar(req('POST', '/api/entrar', { body: { nome: 'J' } }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ erro: 'Use pelo menos 2 letras.' })
  })
})

describe('GET /api/comandos', () => {
  test('sem desde: tudo, com o relógio do servidor', async () => {
    const db = fakeDb()
    const res = await createApi(db, KEY).listar(req('GET', '/api/comandos'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ comandos: [row()], servidor_agora: '2026-11-26T15:00:00.000Z' })
    expect(db.changesSince).toHaveBeenCalledWith(null)
  })

  test('com desde: só o que mudou depois', async () => {
    const db = fakeDb()
    await createApi(db, KEY).listar(req('GET', '/api/comandos?desde=2026-11-26T14:00:00.000Z'))
    expect(db.changesSince).toHaveBeenCalledWith(new Date('2026-11-26T14:00:00.000Z'))
  })

  test('desde inválido: 400', async () => {
    const res = await createApi(fakeDb(), KEY).listar(req('GET', '/api/comandos?desde=ontem'))
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/comandos/:id', () => {
  test('salva com o nome do técnico (com acento) como autor', async () => {
    const db = fakeDb()
    const res = await createApi(db, KEY).salvar(req('PUT', '/api/comandos/local-1', { body }), 'local-1')
    expect(res.status).toBe(200)
    expect((await res.json()).comando.id).toBe('local-1')
    expect(db.ensureUser).toHaveBeenCalledWith('João')
    expect(db.upsertCommand).toHaveBeenCalledWith(expect.objectContaining({ id: 'local-1', modo: 'normal', gera_arquivo: false }), 'u1')
  })

  test('linha que não começa com adb: 400', async () => {
    const res = await createApi(fakeDb(), KEY).salvar(req('PUT', '/api/comandos/local-1', { body: { ...body, comando: 'rm -rf /' } }), 'local-1')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ erro: 'Cada linha precisa começar com adb.' })
  })

  test('id da URL diferente do corpo: 400', async () => {
    const res = await createApi(fakeDb(), KEY).salvar(req('PUT', '/api/comandos/outro', { body }), 'outro')
    expect(res.status).toBe(400)
  })

  test('sem o nome do técnico: 400', async () => {
    const res = await createApi(fakeDb(), KEY).salvar(req('PUT', '/api/comandos/local-1', { body, user: null }), 'local-1')
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ erro: 'Falta o nome do técnico (X-Usuario).' })
  })

  test('cliente não decide se é oficial', async () => {
    const db = fakeDb()
    await createApi(db, KEY).salvar(req('PUT', '/api/comandos/local-1', { body: { ...body, oficial: true } }), 'local-1')
    expect(db.upsertCommand).toHaveBeenCalledWith(expect.not.objectContaining({ oficial: true }), 'u1')
  })
})

describe('DELETE /api/comandos/:id', () => {
  test('marca como excluído', async () => {
    const db = fakeDb()
    const res = await createApi(db, KEY).excluir(req('DELETE', '/api/comandos/local-1'), 'local-1')
    expect(res.status).toBe(200)
    expect((await res.json()).comando.excluido).toBe(true)
    expect(db.softDelete).toHaveBeenCalledWith('local-1', 'u1')
  })

  test('inexistente: 404', async () => {
    const res = await createApi(fakeDb({ softDelete: vi.fn(async () => null) }), KEY).excluir(req('DELETE', '/api/comandos/x'), 'x')
    expect(res.status).toBe(404)
  })
})

test('erro do banco: 500 sem vazar detalhe', async () => {
  const db = fakeDb({
    changesSince: vi.fn(async () => {
      throw new Error('password authentication failed for user neondb_owner')
    }),
  })
  const res = await createApi(db, KEY).listar(req('GET', '/api/comandos'))
  expect(res.status).toBe(500)
  expect(await res.json()).toEqual({ erro: 'Erro no servidor. Tente de novo.' })
})
