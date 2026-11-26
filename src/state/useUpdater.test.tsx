// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { AvailableUpdate, UpdaterApi } from '../lib/updater'
import { useUpdater } from './useUpdater'

function fakeUpdate(install: AvailableUpdate['install'] = async () => {}): AvailableUpdate {
  return { version: '0.3.0', notes: 'Novidades', install: vi.fn(install) }
}

function fakeApi(check: UpdaterApi['check']): UpdaterApi & { relaunch: ReturnType<typeof vi.fn> } {
  return { check: vi.fn(check), relaunch: vi.fn(async () => {}) }
}

test('ao abrir, acha versão nova e avisa', async () => {
  const api = fakeApi(async () => fakeUpdate())
  const { result } = renderHook(() => useUpdater(api, { autoCheck: true }))
  await waitFor(() => expect(result.current.state).toEqual({ kind: 'available', version: '0.3.0', notes: 'Novidades' }))
})

test('ao abrir, sem internet ou sem release, fica quieto', async () => {
  const api = fakeApi(async () => {
    throw new Error('Could not fetch a valid release JSON from the remote')
  })
  const { result } = renderHook(() => useUpdater(api, { autoCheck: true }))
  await waitFor(() => expect(api.check).toHaveBeenCalled())
  await act(async () => {})
  expect(result.current.state).toEqual({ kind: 'idle' })
})

test('sem autoCheck não procura sozinho', async () => {
  const api = fakeApi(async () => null)
  renderHook(() => useUpdater(api))
  await act(async () => {})
  expect(api.check).not.toHaveBeenCalled()
})

test('procurar na mão sem novidade: já está na mais nova', async () => {
  const api = fakeApi(async () => null)
  const { result } = renderHook(() => useUpdater(api))
  await act(() => result.current.check())
  expect(result.current.state).toEqual({ kind: 'none' })
})

test('procurar na mão com erro: mostra a mensagem', async () => {
  const api = fakeApi(async () => {
    throw new Error('network down')
  })
  const { result } = renderHook(() => useUpdater(api))
  await act(() => result.current.check())
  expect(result.current.state).toEqual({ kind: 'error', message: 'Não deu pra procurar atualização (sem internet ou sem versão publicada).' })
})

test('atualizar: mostra o progresso e reinicia no fim', async () => {
  let report: (p: { downloaded: number; total: number | null }) => void = () => {}
  let finish: () => void = () => {}
  const update = fakeUpdate(
    (onProgress) =>
      new Promise<void>((resolve) => {
        report = onProgress
        finish = resolve
      }),
  )
  const api = fakeApi(async () => update)
  const { result } = renderHook(() => useUpdater(api))
  await act(() => result.current.check())
  let done: Promise<void> = Promise.resolve()
  act(() => {
    done = result.current.install()
  })
  expect(result.current.state).toEqual({ kind: 'downloading', version: '0.3.0', percent: null })
  act(() => report({ downloaded: 40, total: 100 }))
  expect(result.current.state).toEqual({ kind: 'downloading', version: '0.3.0', percent: 40 })
  await act(async () => {
    finish()
    await done
  })
  expect(result.current.state).toEqual({ kind: 'restarting' })
  expect(api.relaunch).toHaveBeenCalledTimes(1)
})

test('atualizar com erro: mostra a mensagem', async () => {
  const api = fakeApi(async () =>
    fakeUpdate(async () => {
      throw new Error('signature mismatch')
    }),
  )
  const { result } = renderHook(() => useUpdater(api))
  await act(() => result.current.check())
  await act(() => result.current.install())
  expect(result.current.state).toEqual({ kind: 'error', message: 'Não deu pra atualizar: signature mismatch' })
  expect(api.relaunch).not.toHaveBeenCalled()
})

test('clique duplo em atualizar baixa uma vez só', async () => {
  const update = fakeUpdate(() => new Promise<void>(() => {}))
  const api = fakeApi(async () => update)
  const { result } = renderHook(() => useUpdater(api))
  await act(() => result.current.check())
  act(() => {
    void result.current.install()
    void result.current.install()
  })
  expect(update.install).toHaveBeenCalledTimes(1)
})
