import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import rawCatalog from '../../data/catalog.json'
import { DEFAULT_OUTPUT_DIR, deviceDir, filterCommands, RAIL, togglePinned, type DeviceInfo } from '../lib/appLogic'
import type { Catalog, Command } from '../lib/catalogTypes'
import { MY_CATEGORY, normalizeCategory } from '../lib/commandForm'
import type { TeamApi } from '../lib/teamApi'
import { useTeamSync } from './useTeamSync'

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
  /** API do time (null/ausente = comandos só neste PC). */
  teamApi?: TeamApi | null
  /** Intervalo do sync com o servidor. */
  syncMs?: number
}

const FLASH_MS = 3500

export function useAppState({ listDevices, store, pollMs = 2000, commands: baseCommands = catalog.comandos, onUserSelect, teamApi = null, syncMs }: AppStateDeps) {
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [devicesError, setDevicesError] = useState<string | null>(null)
  const [selectedSerial, setSelectedSerial] = useState<string | null>(null)
  const [rail, setRailState] = useState('Fixados')
  const [search, setSearch] = useState('')
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string[]>(catalog.fixados_padrao)
  const [baseDir, setBaseDirState] = useState(DEFAULT_OUTPUT_DIR)
  const [status, setStatus] = useState<string | null>(null)
  const [windowSize, setWindowSizeState] = useState('livre')
  const [userName, setUserNameState] = useState<string | null>(null)
  // Catálogo do time (embutido + servidor). Sem servidor, os comandos criados ficam neste PC.
  const team = useTeamSync({ api: teamApi, store, embedded: baseCommands, user: userName, pollMs: syncMs })
  const commands = team.commands
  const [userReady, setUserReady] = useState(false)
  const [knownUsers, setKnownUsers] = useState<string[]>([])
  // Perfil ativo: as preferências ficam em chaves "<chave>@<nome>" (cada técnico tem as suas neste PC).
  const userRef = useRef<string | null>(null)
  // Quem já estava logado antes dos perfis existirem herda as chaves antigas (sem "@").
  const legacyOwner = useRef<string | null>(null)
  const keyFor = (key: string) => (userRef.current ? `${key}@${userRef.current.toLowerCase()}` : key)
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
          if (user && user === legacyOwner.current) {
            // Dados de antes dos perfis: copia uma vez para a chave do perfil (na próxima abertura já está lá).
            const legacy = (await store.get<T>(key)) ?? undefined
            if (legacy !== undefined && legacy !== null && legacy !== '') void store.set(scoped(key), legacy)
            return legacy
          }
        } catch {
          // fica o padrão
        }
        return undefined
      }
      // Os comandos não são do perfil: são do time (useTeamSync sobe os antigos "meusComandos" na primeira vez).
      const [pins, dir, size] = [await read<string[]>('fixados'), await read<string>('pastaSaida'), await read<string>('tamanhoJanela')]
      if (userRef.current !== user) return // trocou de perfil enquanto carregava
      setPinned(pins ?? catalog.fixados_padrao)
      setBaseDirState(dir || DEFAULT_OUTPUT_DIR)
      setWindowSizeState(size || 'livre')
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

  const teamSave = team.save
  const teamRemove = team.remove

  /** Cria ou substitui um comando do time e abre ele. Sem conexão, rejeita e nada muda. */
  const saveCommand = useCallback(
    async (c: Command) => {
      await teamSave([c])
      setSelectedCommandId(c.id)
    },
    [teamSave],
  )

  // Comandos do time (não oficiais) de uma categoria, sem diferenciar maiúsculas.
  const teamInCategory = useCallback(
    (name: string) => commands.filter((c) => !c.oficial && !c.excluido && c.categoria.toLowerCase() === name.toLowerCase()),
    [commands],
  )

  /** Renomeia uma categoria criada (todos os comandos dela) e o menu acompanha. */
  const renameCategory = useCallback(
    async (from: string, to: string) => {
      // Nome igual a uma categoria que já existe (fixa ou criada, sem diferenciar maiúsculas) junta com ela.
      const others = commands.filter((c) => !c.excluido).map((c) => c.categoria).filter((c) => c.toLowerCase() !== from.toLowerCase())
      const target = normalizeCategory(to, others)
      if (!target) return
      await teamSave(teamInCategory(from).map((c) => ({ ...c, categoria: target })))
      setRailState((r) => (r.toLowerCase() === from.toLowerCase() ? target : r))
    },
    [commands, teamSave, teamInCategory],
  )

  /** Exclui uma categoria criada: os comandos dela vão para "Meus comandos" (nada é apagado). */
  const deleteCategory = useCallback(
    async (name: string) => {
      await teamSave(teamInCategory(name).map((c) => ({ ...c, categoria: MY_CATEGORY })))
      setRailState((r) => (r.toLowerCase() === name.toLowerCase() ? 'Meus' : r))
    },
    [teamSave, teamInCategory],
  )

  /** Exclusão lógica: marca excluido e tira dos fixados. Sem conexão, rejeita e nada muda. */
  const deleteCommand = useCallback(
    async (id: string) => {
      await teamRemove(id)
      setPinned((current) => {
        if (!current.includes(id)) return current
        const next = current.filter((p) => p !== id)
        void store.set(keyFor('fixados'), next)
        return next
      })
      setSelectedCommandId((current) => (current === id ? null : current))
    },
    [store, teamRemove],
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
      // Outro perfil: começa do Início, sem comando aberto.
      setRailState('Fixados')
      setSearch('')
      setSelectedCommandId(null)
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
    for (const c of commands) {
      const k = c.categoria.trim().toLowerCase()
      if (c.oficial || c.excluido || !k || fixed.has(k) || seen.has(k)) continue
      seen.add(k)
      out.push(c.categoria.trim())
    }
    return out
  }, [commands])

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
    renameCategory,
    deleteCategory,
    syncStatus: team.status,
    currentDeviceDir,
    status,
    flash,
  }
}

export type AppState = ReturnType<typeof useAppState>
