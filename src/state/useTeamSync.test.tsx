// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { Command } from '../lib/catalogTypes'
import { TeamApiError, type TeamApi } from '../lib/teamApi'
import type { ConfigStore } from './useAppState'
import { useTeamSync } from './useTeamSync'

const cmd = (id: string, over: Partial<Command> = {}): Command => ({ id, categoria: 'Rede', nome: id, resumo: '', comando: 'adb shell ls', parametro: null, oficial: false, ...over })
const embedded = [cmd('foco', { categoria: 'Telas', oficial: true })]

function memoryStore(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...initial }
  const store: ConfigStore = {
    get: async <T,>(k: string) => data[k] as T | undefined,
    set: async (k: string, v: unknown) => {
      data[k] = v
    },
  }
  return { store, data }
}

function fakeApi(over: Partial<TeamApi> = {}): TeamApi & Record<keyof TeamApi, ReturnType<typeof vi.fn>> {
  return {
    enter: vi.fn(async () => {}),
    changes: vi.fn(async () => ({ commands: [], serverNow: '2026-11-26T15:00:00.000Z' })),
    save: vi.fn(async (c: Command, user: string) => ({ ...c, autor: user, atualizado_em: '2026-11-26T15:00:01.000Z' })),
    remove: vi.fn(async (id: string) => cmd(id, { excluido: true })),
    ...over,
  } as never
}

const setup = (o: { api?: TeamApi | null; store?: ConfigStore; user?: string | null } = {}) => {
  const store = o.store ?? memoryStore().store // um só por teste (um novo a cada render reiniciaria o hook)
  return renderHook((p: { user: string | null }) => useTeamSync({ api: o.api ?? null, store, embedded, user: p.user, pollMs: 60_000 }), {
    initialProps: { user: o.user === undefined ? 'Ana' : o.user },
  })
}

describe('sem servidor configurado (modo local)', () => {
  test('catálogo embutido e status local', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('local'))
    expect(result.current.commands.map((c) => c.id)).toEqual(['foco'])
  })

  test('salvar guarda neste PC e sobrevive a reabrir', async () => {
    const { store, data } = memoryStore()
    const { result } = setup({ store })
    await waitFor(() => expect(result.current.status).toBe('local'))
    await act(() => result.current.save([cmd('local-1')]))
    expect(result.current.commands.map((c) => c.id)).toEqual(['foco', 'local-1'])
    expect(data.catalogo).toEqual({ 'local-1': expect.objectContaining({ id: 'local-1' }) })

    const again = setup({ store })
    await waitFor(() => expect(again.result.current.commands.map((c) => c.id)).toEqual(['foco', 'local-1']))
  })

  test('excluir marca como excluído (lógico)', async () => {
    const { store } = memoryStore({ catalogo: { 'local-1': cmd('local-1') } })
    const { result } = setup({ store })
    await waitFor(() => expect(result.current.commands).toHaveLength(2))
    await act(() => result.current.remove('local-1'))
    expect(result.current.commands.find((c) => c.id === 'local-1')?.excluido).toBe(true)
  })
})

describe('com servidor', () => {
  test('ao abrir: usa o cache na hora e depois sincroniza tudo', async () => {
    const { store, data } = memoryStore({ catalogo: { velho: cmd('velho') } })
    const api = fakeApi({ changes: vi.fn(async () => ({ commands: [cmd('novo', { autor: 'Bia' })], serverNow: '2026-11-26T15:00:00.000Z' })) })
    const { result } = setup({ api, store })
    await waitFor(() => expect(result.current.status).toBe('online'))
    expect(api.changes).toHaveBeenCalledWith(null)
    expect(result.current.commands.map((c) => c.id)).toEqual(['foco', 'velho', 'novo'])
    expect(data.ultimoSync).toBe('2026-11-26T15:00:00.000Z')
  })

  test('próximo sync pede só o que mudou desde o relógio do servidor', async () => {
    const { store } = memoryStore({ ultimoSync: '2026-11-26T14:00:00.000Z' })
    const api = fakeApi()
    const { result } = setup({ api, store })
    await waitFor(() => expect(result.current.status).toBe('online'))
    expect(api.changes).toHaveBeenLastCalledWith('2026-11-26T14:00:00.000Z')
    await act(() => result.current.syncNow())
    expect(api.changes).toHaveBeenLastCalledWith('2026-11-26T15:00:00.000Z')
  })

  test('sem internet: status offline e o catálogo continua', async () => {
    const api = fakeApi({
      changes: vi.fn(async () => {
        throw new TeamApiError('Sem conexão com o servidor.', true)
      }),
    })
    const { result } = setup({ api })
    await waitFor(() => expect(result.current.status).toBe('offline'))
    expect(result.current.commands.map((c) => c.id)).toEqual(['foco'])
  })

  test('salvar manda pro servidor com o nome e usa a resposta (autor)', async () => {
    const api = fakeApi()
    const { result } = setup({ api })
    await waitFor(() => expect(result.current.status).toBe('online'))
    await act(() => result.current.save([cmd('local-1')]))
    expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'local-1' }), 'Ana')
    expect(result.current.commands.find((c) => c.id === 'local-1')?.autor).toBe('Ana')
  })

  test('salvar sem internet: falha e não muda nada', async () => {
    const api = fakeApi({
      save: vi.fn(async () => {
        throw new TeamApiError('Sem conexão com o servidor.', true)
      }),
    })
    const { result } = setup({ api })
    await waitFor(() => expect(result.current.status).toBe('online'))
    // O erro é pego dentro do act: se o act for rejeitado, o React descarta as atualizações pendentes.
    let err: unknown
    await act(async () => {
      await result.current.save([cmd('local-1')]).catch((e) => {
        err = e
      })
    })
    expect(err).toBeInstanceOf(TeamApiError)
    expect(result.current.status).toBe('offline')
    expect(result.current.commands.map((c) => c.id)).toEqual(['foco'])
  })

  test('excluir manda pro servidor', async () => {
    const { store } = memoryStore({ catalogo: { 'local-1': cmd('local-1') } })
    const api = fakeApi()
    const { result } = setup({ api, store })
    await waitFor(() => expect(result.current.status).toBe('online'))
    await act(() => result.current.remove('local-1'))
    expect(api.remove).toHaveBeenCalledWith('local-1', 'Ana')
    expect(result.current.commands.find((c) => c.id === 'local-1')?.excluido).toBe(true)
  })

  test('registra o nome do técnico ao entrar', async () => {
    const api = fakeApi()
    setup({ api, user: 'Ana' })
    await waitFor(() => expect(api.enter).toHaveBeenCalledWith('Ana'))
  })
})

describe('comandos criados antes da sincronização', () => {
  test('sobem pro time com o nome do perfil e saem do armazenamento antigo', async () => {
    const { store, data } = memoryStore({ 'meusComandos@ana': [cmd('local-1'), cmd('local-2', { excluido: true })] })
    const api = fakeApi()
    const { result } = setup({ api, store, user: 'Ana' })
    await waitFor(() => expect(data['meusComandos@ana']).toEqual([]))
    expect(api.save).toHaveBeenCalledTimes(1)
    expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'local-1' }), 'Ana')
    expect(result.current.commands.map((c) => c.id)).toContain('local-1')
  })

  test('os de antes dos perfis (chave sem @) também sobem', async () => {
    const { store, data } = memoryStore({ meusComandos: [cmd('local-9')] })
    const api = fakeApi()
    setup({ api, store, user: 'Ana' })
    await waitFor(() => expect(data.meusComandos).toEqual([]))
    expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'local-9' }), 'Ana')
  })

  test('sem internet: ficam guardados e sobem quando a conexão volta', async () => {
    const { store, data } = memoryStore({ 'meusComandos@ana': [cmd('local-1')] })
    let online = false
    const api = fakeApi({
      changes: vi.fn(async () => {
        if (!online) throw new TeamApiError('Sem conexão com o servidor.', true)
        return { commands: [], serverNow: '2026-11-26T15:00:00.000Z' }
      }),
    })
    const { result } = setup({ api, store, user: 'Ana' })
    await waitFor(() => expect(result.current.status).toBe('offline'))
    expect(api.save).not.toHaveBeenCalled()
    expect(data['meusComandos@ana']).toHaveLength(1)
    online = true
    await act(() => result.current.syncNow())
    await waitFor(() => expect(data['meusComandos@ana']).toEqual([]))
    expect(api.save).toHaveBeenCalledTimes(1)
  })

  test('no modo local também entram no catálogo deste PC', async () => {
    const { store, data } = memoryStore({ 'meusComandos@ana': [cmd('local-1')] })
    const { result } = setup({ store, user: 'Ana' })
    await waitFor(() => expect(result.current.commands.map((c) => c.id)).toContain('local-1'))
    expect(data['meusComandos@ana']).toEqual([])
  })
})
