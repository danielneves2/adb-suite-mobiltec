import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import rawCatalog from '../../data/catalog.json'
import { DEFAULT_OUTPUT_DIR, deviceDir, filterCommands, RAIL, togglePinned, type DeviceInfo } from '../lib/appLogic'
import type { Catalog, Command } from '../lib/catalogTypes'

const catalog = rawCatalog as unknown as Catalog

/** Persistência local (plugin-store no app; memória nos testes). */
export interface ConfigStore {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
}

export interface AppStateDeps {
  listDevices: () => Promise<DeviceInfo[]>
  store: ConfigStore
  pollMs?: number
  commands?: Command[]
  /** Chamado quando o técnico escolhe aparelho ou comando (não na seleção automática do polling). */
  onUserSelect?: (kind: 'device' | 'command') => void
}

const FLASH_MS = 3500

export function useAppState({ listDevices, store, pollMs = 2000, commands: baseCommands = catalog.comandos, onUserSelect }: AppStateDeps) {
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [devicesError, setDevicesError] = useState<string | null>(null)
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null)
  const [rail, setRailState] = useState('Fixados')
  const [search, setSearch] = useState('')
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string[]>(catalog.fixados_padrao)
  const [baseDir, setBaseDirState] = useState(DEFAULT_OUTPUT_DIR)
  const [status, setStatus] = useState<string | null>(null)
  const [localCommands, setLocalCommands] = useState<Command[]>([])
  const [windowSize, setWindowSizeState] = useState('livre')
  const [userName, setUserNameState] = useState<string | null>(null)
  const [userReady, setUserReady] = useState(false)
  const [knownUsers, setKnownUsers] = useState<string[]>([])
  // Perfil ativo: as preferências ficam em chaves "<chave>@<nome>" (cada técnico tem as suas neste PC).
  const userRef = useRef<string | null>(null)
  // Quem já estava logado antes dos perfis existirem herda as chaves antigas (sem "@").
  const legacyOwner = useRef<string | null>(null)
  const keyFor = (key: string) => (userRef.current ? `${key}@${userRef.current.toLowerCase()}` : key)
  const commands = useMemo(() => [...baseCommands, ...localCommands], [baseCommands, localCommands])
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Carrega as preferências do perfil (ou os padrões, para um nome novo). */
  const loadProfile = useCallback(
    async (user: string | null) => {
      const scoped = (key: string) => (user ? `${key}@${user.toLowerCase()}` : key)
      // Cada item carrega sozinho: um valor corrompido não impede os outros de carregar.
      const read = async <T,>(key: string): Promise<T | undefined> => {
        try {
          const v = await store.get<T>(scoped(key))
          if (v !== undefined && v !== null && v !== '') return v
          if (user && user === legacyOwner.current) return (await store.get<T>(key)) ?? undefined
        } catch {
          // fica o padrão
        }
        return undefined
      }
      const [pins, dir, size, mine] = [await read<string[]>('fixados'), await read<string>('pastaSaida'), await read<string>('tamanhoJanela'), await read<Command[]>('meusComandos')]
      if (userRef.current !== user) return // trocou de perfil enquanto carregava
      setPinned(pins ?? catalog.fixados_padrao)
      setBaseDirState(dir || DEFAULT_OUTPUT_DIR)
      setWindowSizeState(size || 'livre')
      setLocalCommands(mine ?? [])
    },
    [store],
  )

  // Configuração salva: quem está logado, os perfis conhecidos e as preferências do perfil.
  useEffect(() => {
    void (async () => {
      let current: string | null = null
      let list: string[] | undefined
      try {
        current = (await store.get<string>('usuario')) || null
      } catch {
        current = null
      }
      try {
        list = await store.get<string[]>('usuarios')
      } catch {
        list = undefined
      }
      if (!list) {
        list = current ? [current] : []
        legacyOwner.current = current
        if (current) void store.set('usuarios', list).catch(() => {})
      }
      userRef.current = current
      setKnownUsers(list)
      setUserNameState(current)
      setUserReady(true)
      await loadProfile(current)
    })()
  }, [store, loadProfile])

  // Aparelhos: polling.
  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const list = await listDevices()
        if (!alive) return
        setDevices(list)
        setDevicesError(null)
        setSelectedSerial((current) => {
          if (current && list.some((d) => d.serial === current)) return current
          return (list.find((d) => d.state === 'device') ?? list[0])?.serial ?? null
        })
      } catch (e) {
        if (alive) setDevicesError(String(e))
      }
    }
    void tick()
    const id = setInterval(tick, pollMs)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [listDevices, pollMs])

  const flash = useCallback((msg: string) => {
    setStatus(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setStatus(null), FLASH_MS)
  }, [])

  const setRail = useCallback((key: string) => {
    setRailState(key)
    setSearch('')
  }, [])

  const togglePin = useCallback(
    (id: string) => {
      setPinned((current) => {
        const next = togglePinned(current, id)
        void store.set(keyFor('fixados'), next)
        return next
      })
    },
    [store],
  )

  /** Cria ou substitui um comando do técnico, guarda neste computador e abre ele. */
  const saveCommand = useCallback(
    (c: Command) => {
      setLocalCommands((current) => {
        const next = current.some((x) => x.id === c.id) ? current.map((x) => (x.id === c.id ? c : x)) : [...current, c]
        void store.set(keyFor('meusComandos'), next)
        return next
      })
      setSelectedCommandId(c.id)
    },
    [store],
  )

  /** Exclusão lógica: marca excluido e tira dos fixados. */
  const deleteCommand = useCallback(
    (id: string) => {
      setLocalCommands((current) => {
        const next = current.map((x) => (x.id === id ? { ...x, excluido: true, atualizado_em: new Date().toISOString() } : x))
        void store.set(keyFor('meusComandos'), next)
        return next
      })
      setPinned((current) => {
        if (!current.includes(id)) return current
        const next = current.filter((p) => p !== id)
        void store.set(keyFor('fixados'), next)
        return next
      })
      setSelectedCommandId((current) => (current === id ? null : current))
    },
    [store],
  )

  /**
   * Entrar com um nome (fica salvo e entra na lista de perfis; volta com as preferências desse nome)
   * ou sair (null: a lista continua para entrar de novo com um clique).
   */
  const setUserName = useCallback(
    async (name: string | null) => {
      const typed = name?.trim() || null
      if (!typed) {
        userRef.current = null
        setUserNameState(null)
        void store.set('usuario', '')
        return
      }
      // Mesmo nome com outra caixa ("ana" / "Ana") é o mesmo perfil: mantém a grafia salva.
      const existing = knownUsers.find((u) => u.toLowerCase() === typed.toLowerCase())
      const user = existing ?? typed
      const list = [user, ...knownUsers.filter((u) => u.toLowerCase() !== user.toLowerCase())]
      userRef.current = user
      setUserNameState(user)
      setKnownUsers(list)
      void store.set('usuario', user)
      void store.set('usuarios', list)
      await loadProfile(user)
    },
    [store, knownUsers, loadProfile],
  )

  /** Tira um nome da lista de perfis da tela de entrada. */
  const forgetUser = useCallback(
    (name: string) => {
      setKnownUsers((current) => {
        const next = current.filter((u) => u.toLowerCase() !== name.toLowerCase())
        void store.set('usuarios', next)
        return next
      })
    },
    [store],
  )

  const setWindowSize = useCallback(
    (id: string) => {
      setWindowSizeState(id)
      void store.set(keyFor('tamanhoJanela'), id)
    },
    [store],
  )

  const setBaseDir = useCallback(
    (dir: string) => {
      const next = dir.trim() || DEFAULT_OUTPUT_DIR
      setBaseDirState(next)
      void store.set(keyFor('pastaSaida'), next)
    },
    [store],
  )

  const userSelect = useRef(onUserSelect)
  userSelect.current = onUserSelect
  const selectSerial = useCallback((serial: string | null) => {
    userSelect.current?.('device')
    setSelectedSerial(serial)
  }, [])
  const selectCommand = useCallback((id: string | null) => {
    userSelect.current?.('command')
    setSelectedCommandId(id)
  }, [])

  // Categorias criadas pelo técnico (fora das fixas do menu): viram itens do menu também.
  const customCategories = useMemo(() => {
    const fixed = new Set([...RAIL.map((r) => r.key.toLowerCase()), 'meus comandos'])
    const seen = new Set<string>()
    const out: string[] = []
    for (const c of localCommands) {
      const k = c.categoria.trim().toLowerCase()
      if (c.excluido || !k || fixed.has(k) || seen.has(k)) continue
      seen.add(k)
      out.push(c.categoria.trim())
    }
    return out
  }, [localCommands])

  const listCommands = useMemo(() => filterCommands(commands, { search, rail, pinned }), [commands, search, rail, pinned])
  const searching = search.trim() !== ''
  const listTitle = searching ? 'Resultados' : (RAIL.find((r) => r.key === rail)?.title ?? rail)
  const emptyText = searching
    ? 'Nenhum comando encontrado.'
    : rail === 'Fixados'
      ? 'Nada fixado. Abra um comando e clique em Fixar.'
      : 'Nenhum comando seu ainda. Use “+ Novo comando”.'

  const selectedDevice = devices.find((d) => d.serial === selectedSerial) ?? null
  const selectedCommand = commands.find((c) => c.id === selectedCommandId) ?? null
  const currentDeviceDir = selectedDevice ? deviceDir(baseDir, selectedDevice) : null

  return {
    commands,
    devices,
    devicesError,
    selectedSerial,
    selectSerial,
    selectedDevice,
    rail,
    setRail,
    search,
    setSearch,
    searching,
    listCommands,
    listTitle,
    emptyText,
    selectedCommandId,
    selectCommand,
    selectedCommand,
    pinned,
    togglePin,
    saveCommand,
    deleteCommand,
    baseDir,
    setBaseDir,
    windowSize,
    setWindowSize,
    userName,
    userReady,
    setUserName,
    knownUsers,
    forgetUser,
    customCategories,
    currentDeviceDir,
    status,
    flash,
  }
}

export type AppState = ReturnType<typeof useAppState>
