// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { DeviceInfo } from '../lib/appLogic'
import { useAppState, type ConfigStore } from './useAppState'

const a54: DeviceInfo = { serial: 'R58N', state: 'device', brand: 'Samsung', model: 'Galaxy A54', android: '14' }

function memoryStore(initial: Record<string, unknown> = {}): ConfigStore {
  const data = { ...initial }
  return {
    get: async <T,>(k: string) => data[k] as T | undefined,
    set: async (k: string, v: unknown) => {
      data[k] = v
    },
  }
}

const setup = (store = memoryStore(), devices: DeviceInfo[] = [a54]) =>
  renderHook(() => useAppState({ listDevices: async () => devices, store, pollMs: 60_000 }))

test('começa em Fixados com os fixados padrão e seleciona o 1º aparelho pronto', async () => {
  const { result } = setup()
  await waitFor(() => expect(result.current.selectedSerial).toBe('R58N'))
  expect(result.current.rail).toBe('Fixados')
  expect(result.current.pinned).toEqual(['extrair', 'logcontinuo', 'bugreport', 'desinstalar', 'foco'])
  expect(result.current.baseDir).toBe('C:\\ADB-Suite\\Saidas')
})

test('clicar numa categoria limpa a busca', async () => {
  const { result } = setup()
  act(() => result.current.setSearch('apk'))
  expect(result.current.listTitle).toBe('Resultados')
  act(() => result.current.setRail('Apps'))
  expect(result.current.search).toBe('')
  expect(result.current.listTitle).toBe('Apps')
})

test('fixar persiste', async () => {
  const store = memoryStore()
  const { result } = setup(store)
  await waitFor(() => expect(result.current.selectedSerial).toBe('R58N'))
  act(() => result.current.togglePin('foco'))
  await waitFor(() => expect(result.current.pinned).not.toContain('foco'))
  expect(await store.get('fixados')).toEqual(['extrair', 'logcontinuo', 'bugreport', 'desinstalar'])
})

test('pasta base salva e vazia volta ao padrão', async () => {
  const store = memoryStore({ pastaSaida: 'D:\\Saidas' })
  const { result } = setup(store)
  await waitFor(() => expect(result.current.baseDir).toBe('D:\\Saidas'))
  act(() => result.current.setBaseDir('  '))
  await waitFor(() => expect(result.current.baseDir).toBe('C:\\ADB-Suite\\Saidas'))
})

test('texto vazio da lista conforme o contexto', async () => {
  const { result } = setup(memoryStore({ fixados: [] }))
  await waitFor(() => expect(result.current.pinned).toEqual([]))
  expect(result.current.emptyText).toBe('Nada fixado. Abra um comando e clique em Fixar.')
  act(() => result.current.setSearch('zzzz'))
  expect(result.current.emptyText).toBe('Nenhum comando encontrado.')
})

test('só a escolha do técnico avisa onUserSelect; a seleção automática do polling não', async () => {
  const onUserSelect = vi.fn()
  const { result } = renderHook(() => useAppState({ listDevices: async () => [a54], store: memoryStore(), pollMs: 60_000, onUserSelect }))
  await waitFor(() => expect(result.current.selectedSerial).toBe('R58N'))
  expect(onUserSelect).not.toHaveBeenCalled()
  act(() => result.current.selectCommand('foco'))
  act(() => result.current.selectSerial('R58N'))
  expect(onUserSelect).toHaveBeenCalledTimes(2)
})
