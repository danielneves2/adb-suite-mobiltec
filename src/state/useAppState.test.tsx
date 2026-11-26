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

/** Cache do catálogo do time (chave 'catalogo' do store). */
const cache = (...cs: { id: string }[]) => Object.fromEntries(cs.map((c) => [c.id, c]))

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
    const { result } = setup(memoryStore({ catalogo: cache(meu) }))
    await waitFor(() => expect(result.current.commands.some((c) => c.id === 'local-1')).toBe(true))
    act(() => result.current.setRail('Meus'))
    expect(result.current.listCommands.map((c) => c.id)).toEqual(['local-1'])
  })

  test('salvar novo persiste e seleciona; salvar de novo substitui', async () => {
    const store = memoryStore()
    const { result } = setup(store)
    await waitFor(() => expect(result.current.userReady).toBe(true))
    await act(() => result.current.saveCommand(meu))
    expect(result.current.selectedCommandId).toBe('local-1')
    await act(() => result.current.saveCommand({ ...meu, nome: 'Wi-Fi' }))
    expect(result.current.commands.filter((c) => c.id === 'local-1').map((c) => c.nome)).toEqual(['Wi-Fi'])
    expect(await store.get('catalogo')).toEqual({ 'local-1': { ...meu, nome: 'Wi-Fi', atualizado_em: expect.any(String) } })
  })

  test('excluir é lógico: some da lista e dos fixados, mas fica guardado com excluido', async () => {
    const store = memoryStore({ catalogo: cache(meu), fixados: ['local-1', 'foco'] })
    const { result } = setup(store)
    await waitFor(() => expect(result.current.pinned).toContain('local-1'))
    await act(() => result.current.deleteCommand('local-1'))
    act(() => result.current.setRail('Meus'))
    expect(result.current.listCommands).toEqual([])
    expect(result.current.pinned).toEqual(['foco'])
    expect(await store.get('catalogo')).toEqual({ 'local-1': expect.objectContaining({ id: 'local-1', excluido: true }) })
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
    await act(async () => result.current.setUserName('  Daniel Lima '))
    expect(result.current.userName).toBe('Daniel Lima')
    expect(await store.get('usuario')).toBe('Daniel Lima')
  })
  test('carrega o salvo; sair esquece', async () => {
    const store = memoryStore({ usuario: 'Daniel' })
    const { result } = setup(store)
    await waitFor(() => expect(result.current.userName).toBe('Daniel'))
    await act(async () => result.current.setUserName(null))
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

test('se uma configuração falhar ao ler, as outras carregam e o app fica pronto', async () => {
  const store: ConfigStore = {
    get: async <T,>(k: string) => {
      if (k === 'fixados') throw new Error('arquivo corrompido')
      return (k === 'usuario' ? 'Daniel' : undefined) as T | undefined
    },
    set: async () => {},
  }
  const { result } = setup(store)
  await waitFor(() => expect(result.current.userReady).toBe(true))
  expect(result.current.userName).toBe('Daniel')
})

describe('perfis: cada nome guarda o seu', () => {
  test('sair mantém o nome na lista; cada usuário volta com os próprios fixados e pasta', async () => {
    const store = memoryStore()
    const { result } = setup(store)
    await waitFor(() => expect(result.current.userReady).toBe(true))
    await act(async () => result.current.setUserName('Ana'))
    act(() => result.current.togglePin('info'))
    act(() => result.current.setBaseDir('D:\\Ana'))
    await act(async () => result.current.setUserName(null))
    expect(result.current.knownUsers).toEqual(['Ana'])

    await act(async () => result.current.setUserName('Bruno'))
    expect(result.current.pinned).not.toContain('info')
    expect(result.current.baseDir).toBe('C:\\ADB-Suite\\Saidas')
    expect(result.current.knownUsers).toEqual(['Bruno', 'Ana'])

    await act(async () => result.current.setUserName(null))
    await act(async () => result.current.setUserName('ana'))
    expect(result.current.userName).toBe('Ana')
    expect(result.current.pinned).toContain('info')
    expect(result.current.baseDir).toBe('D:\\Ana')
    expect(result.current.knownUsers).toEqual(['Ana', 'Bruno'])
  })

  test('comandos são do time: o que a Ana cria aparece pro Bruno', async () => {
    const store = memoryStore()
    const { result } = setup(store)
    await waitFor(() => expect(result.current.userReady).toBe(true))
    await act(async () => result.current.setUserName('Ana'))
    await act(() => result.current.saveCommand({ id: 'local-a', categoria: 'Meus comandos', nome: 'Da Ana', resumo: '', comando: 'adb shell ls', parametro: null, oficial: false }))
    await act(async () => result.current.setUserName(null))
    await act(async () => result.current.setUserName('Bruno'))
    expect(result.current.commands.some((c) => c.id === 'local-a')).toBe(true)
  })

  test('esquecer tira o perfil da lista', async () => {
    const { result } = setup(memoryStore({ usuarios: ['Ana', 'Bruno'] }))
    await waitFor(() => expect(result.current.knownUsers).toEqual(['Ana', 'Bruno']))
    act(() => result.current.forgetUser('Ana'))
    expect(result.current.knownUsers).toEqual(['Bruno'])
  })

  test('dados de antes dos perfis passam para o usuário que já estava logado', async () => {
    const { result } = setup(memoryStore({ usuario: 'Daniel', fixados: ['foco'], pastaSaida: 'E:\\Logs' }))
    await waitFor(() => expect(result.current.userName).toBe('Daniel'))
    await waitFor(() => expect(result.current.pinned).toEqual(['foco']))
    expect(result.current.baseDir).toBe('E:\\Logs')
    expect(result.current.knownUsers).toEqual(['Daniel'])
  })
})

test('categorias criadas pelo técnico (fora das fixas) viram itens do menu', async () => {
  const mk = (id: string, categoria: string, excluido = false) => ({ id, categoria, nome: id, resumo: '', comando: 'adb shell ls', parametro: null, oficial: false, excluido })
  const { result } = setup(memoryStore({ catalogo: cache(mk('a', 'Rede'), mk('b', 'Apps'), mk('c', 'Meus comandos'), mk('d', 'Zebra', true), mk('e', 'rede')) }))
  await waitFor(() => expect(result.current.customCategories).toEqual(['Rede']))
  act(() => result.current.setRail('Rede'))
  expect(result.current.listCommands.map((c) => c.id)).toEqual(['a', 'e']) // 'rede' e 'Rede' são a mesma categoria
  expect(result.current.listTitle).toBe('Rede')
})

describe('gerenciar categorias criadas', () => {
  const mk = (id: string, categoria: string) => ({ id, categoria, nome: id, resumo: '', comando: 'adb shell ls', parametro: null, oficial: false, excluido: false })
  test('renomear troca a categoria dos comandos e o menu acompanha', async () => {
    const store = memoryStore({ catalogo: cache(mk('a', 'Rede'), mk('b', 'Rede'), mk('c', 'Apps')) })
    const { result } = setup(store)
    await waitFor(() => expect(result.current.customCategories).toEqual(['Rede']))
    act(() => result.current.setRail('Rede'))
    await act(() => result.current.renameCategory('Rede', 'Wi-Fi'))
    expect(result.current.customCategories).toEqual(['Wi-Fi'])
    expect(result.current.rail).toBe('Wi-Fi')
    expect(result.current.listCommands.map((c) => c.id)).toEqual(['a', 'b'])
  })
  test('excluir categoria leva os comandos pra Meus comandos (nada é apagado)', async () => {
    const { result } = setup(memoryStore({ catalogo: cache(mk('a', 'Rede'), mk('b', 'Rede')) }))
    await waitFor(() => expect(result.current.customCategories).toEqual(['Rede']))
    act(() => result.current.setRail('Rede'))
    await act(() => result.current.deleteCategory('Rede'))
    expect(result.current.customCategories).toEqual([])
    expect(result.current.rail).toBe('Meus')
    expect(result.current.listCommands.map((c) => [c.id, c.categoria])).toEqual([
      ['a', 'Meus comandos'],
      ['b', 'Meus comandos'],
    ])
  })
})

describe('3ª revisão', () => {
  test('dados de antes dos perfis continuam lá na segunda abertura (migração grava nas chaves do perfil)', async () => {
    const meu = { id: 'local-1', categoria: 'Meus comandos', nome: 'Meu', resumo: '', comando: 'adb shell ls', parametro: null, oficial: false, excluido: false }
    const store = memoryStore({ usuario: 'Daniel', fixados: ['foco'], pastaSaida: 'E:/Logs', meusComandos: [meu] })
    const first = setup(store)
    await waitFor(() => expect(first.result.current.baseDir).toBe('E:/Logs'))
    first.unmount()
    const second = setup(store)
    await waitFor(() => expect(second.result.current.userName).toBe('Daniel'))
    await waitFor(() => expect(second.result.current.baseDir).toBe('E:/Logs'))
    expect(second.result.current.pinned).toEqual(['foco'])
    expect(second.result.current.commands.some((c) => c.id === 'local-1')).toBe(true)
  })

  test('renomear para um nome que já existe (outra caixa) usa a grafia existente', async () => {
    const mk = (id: string, categoria: string) => ({ id, categoria, nome: id, resumo: '', comando: 'adb shell ls', parametro: null, oficial: false, excluido: false })
    const { result } = setup(memoryStore({ catalogo: cache(mk('a', 'Wifi'), mk('b', 'Rede')) }))
    await waitFor(() => expect(result.current.customCategories).toEqual(['Wifi', 'Rede']))
    await act(() => result.current.renameCategory('Wifi', 'rede'))
    expect(result.current.customCategories).toEqual(['Rede'])
    act(() => result.current.setRail('Rede'))
    expect(result.current.listCommands.map((c) => c.id)).toEqual(['a', 'b'])
  })

  test('trocar de usuário volta pro Início, sem comando aberto', async () => {
    const store = memoryStore()
    const { result } = setup(store)
    await waitFor(() => expect(result.current.userReady).toBe(true))
    await act(async () => result.current.setUserName('Ana'))
    act(() => result.current.setRail('Logs'))
    act(() => result.current.selectCommand('foco'))
    await act(async () => result.current.setUserName(null))
    await act(async () => result.current.setUserName('Bruno'))
    expect(result.current.rail).toBe('Fixados')
    expect(result.current.selectedCommandId).toBeNull()
  })
})
