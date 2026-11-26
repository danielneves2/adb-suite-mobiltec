import type { Command } from './catalogTypes'
import { createTeamApi, TeamApiError } from './teamApi'

const cmd: Command = { id: 'local-1', categoria: 'Rede', nome: 'Wi-Fi', resumo: '', comando: 'adb shell ls', parametro: null }

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))
}

test('changes: manda a chave e o desde, devolve comandos e relógio do servidor', async () => {
  const f = fakeFetch(200, { comandos: [cmd], servidor_agora: '2026-11-26T15:00:00.000Z' })
  const api = createTeamApi('https://api.test/', 'k', f)
  const r = await api.changes('2026-11-26T14:00:00.000Z')
  expect(r).toEqual({ commands: [cmd], serverNow: '2026-11-26T15:00:00.000Z' })
  const [url, init] = f.mock.calls[0]
  expect(url).toBe('https://api.test/api/comandos?desde=2026-11-26T14%3A00%3A00.000Z')
  expect(new Headers(init?.headers).get('x-app-key')).toBe('k')
})

test('save: PUT com o nome codificado (acento) e o corpo só com campos da API', async () => {
  const f = fakeFetch(200, { comando: { ...cmd, autor: 'João' } })
  const saved = await createTeamApi('https://api.test', 'k', f).save({ ...cmd, autor: 'x', oficial: false }, 'João')
  expect(saved.autor).toBe('João')
  const [url, init] = f.mock.calls[0]
  expect(url).toBe('https://api.test/api/comandos/local-1')
  expect(init?.method).toBe('PUT')
  expect(new Headers(init?.headers).get('x-usuario')).toBe('Jo%C3%A3o')
  expect(JSON.parse(String(init?.body))).not.toHaveProperty('autor')
})

test('erro da API vira TeamApiError com a mensagem do servidor', async () => {
  const api = createTeamApi('https://api.test', 'k', fakeFetch(400, { erro: 'Cada linha precisa começar com adb.' }))
  await expect(api.remove('x', 'Ana')).rejects.toEqual(new TeamApiError('Cada linha precisa começar com adb.', false))
})

test('sem rede vira TeamApiError offline', async () => {
  const f = vi.fn(async () => {
    throw new TypeError('Failed to fetch')
  })
  const err = await createTeamApi('https://api.test', 'k', f)
    .enter('Ana')
    .catch((e) => e)
  expect(err).toBeInstanceOf(TeamApiError)
  expect(err.offline).toBe(true)
  expect(err.message).toBe('Sem conexão com o servidor.')
})
