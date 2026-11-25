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

describe('comandos do técnico (salvos neste computador)', () => {
  const meu = { id: 'local-1', categoria: 'Meus comandos', nome: 'Abrir Wi-Fi', resumo: '', comando: 'adb shell am start -a android.settings.WIFI_SETTINGS', parametro: null, oficial: false, excluido: false }

  test('comandos salvos aparecem em Meus', async () => {
    const { result } = setup(memoryStore({ meusComandos: [meu] }))
    await waitFor(() => expect(result.current.commands.some((c) => c.id === 'local-1')).toBe(true))
    act(() => result.current.setRail('Meus'))
    expect(result.current.listCommands.map((c) => c.id)).toEqual(['local-1'])
  })

  test('salvar novo persiste e seleciona; salvar de novo substitui', async () => {
    const store = memoryStore()
    const { result } = setup(store)
    act(() => result.current.saveCommand(meu))
    expect(result.current.selectedCommandId).toBe('local-1')
    act(() => result.current.saveCommand({ ...meu, nome: 'Wi-Fi' }))
    expect(result.current.commands.filter((c) => c.id === 'local-1').map((c) => c.nome)).toEqual(['Wi-Fi'])
    expect(await store.get('meusComandos')).toEqual([{ ...meu, nome: 'Wi-Fi' }])
  })

  test('excluir é lógico: some da lista e dos fixados, mas fica guardado com excluido', async () => {
    const store = memoryStore({ meusComandos: [meu], fixados: ['local-1', 'foco'] })
    const { result } = setup(store)
    await waitFor(() => expect(result.current.pinned).toContain('local-1'))
    act(() => result.current.deleteCommand('local-1'))
    act(() => result.current.setRail('Meus'))
    expect(result.current.listCommands).toEqual([])
    expect(result.current.pinned).toEqual(['foco'])
    expect(await store.get('meusComandos')).toEqual([expect.objectContaining({ id: 'local-1', excluido: true })])
  })
})

describe('tamanho da janela', () => {
  test('padrão é livre; escolher persiste', async () => {
    const store = memoryStore()
    const { result } = setup(store)
    expect(result.current.windowSize).toBe('livre')
    act(() => result.current.setWindowSize('1440x900'))
    expect(result.current.windowSize).toBe('1440x900')
    expect(await store.get('tamanhoJanela')).toBe('1440x900')
  })
  test('carrega o salvo', async () => {
    const { result } = setup(memoryStore({ tamanhoJanela: '1600x900' }))
    await waitFor(() => expect(result.current.windowSize).toBe('1600x900'))
  })
})

describe('usuário (só nome, fica logado)', () => {
  test('sem nome salvo: pronto e vazio; entrar persiste', async () => {
    const store = memoryStore()
    const { result } = setup(store)
    await waitFor(() => expect(result.current.userReady).toBe(true))
    expect(result.current.userName).toBeNull()
    act(() => result.current.setUserName('  Daniel Lima '))
    expect(result.current.userName).toBe('Daniel Lima')
    expect(await store.get('usuario')).toBe('Daniel Lima')
  })
  test('carrega o salvo; sair esquece', async () => {
    const store = memoryStore({ usuario: 'Daniel' })
    const { result } = setup(store)
    await waitFor(() => expect(result.current.userName).toBe('Daniel'))
    act(() => result.current.setUserName(null))
    expect(result.current.userName).toBeNull()
    expect(await store.get('usuario')).toBe('')
  })
})

test('onUserSelect diz se foi troca de aparelho ou de comando', async () => {
  const onUserSelect = vi.fn()
  const { result } = renderHook(() => useAppState({ listDevices: async () => [a54], store: memoryStore(), pollMs: 60_000, onUserSelect }))
  await waitFor(() => expect(result.current.selectedSerial).toBe('R58N'))
  act(() => result.current.selectSerial('R58N'))
  act(() => result.current.selectCommand('foco'))
  expect(onUserSelect.mock.calls).toEqual([['device'], ['command']])
})
