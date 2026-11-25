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
  onUserSelect?: () => void
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
  const commands = useMemo(() => [...baseCommands, ...localCommands], [baseCommands, localCommands])
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Configuração salva.
  useEffect(() => {
    void (async () => {
      const savedPinned = await store.get<string[]>('fixados')
      if (savedPinned) setPinned(savedPinned)
      const savedDir = await store.get<string>('pastaSaida')
      if (savedDir) setBaseDirState(savedDir)
      const mine = await store.get<Command[]>('meusComandos')
      if (mine) setLocalCommands(mine)
    })()
  }, [store])

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
        void store.set('fixados', next)
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
        void store.set('meusComandos', next)
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
        void store.set('meusComandos', next)
        return next
      })
      setPinned((current) => {
        if (!current.includes(id)) return current
        const next = current.filter((p) => p !== id)
        void store.set('fixados', next)
        return next
      })
      setSelectedCommandId((current) => (current === id ? null : current))
    },
    [store],
  )

  const setBaseDir = useCallback(
    (dir: string) => {
      const next = dir.trim() || DEFAULT_OUTPUT_DIR
      setBaseDirState(next)
      void store.set('pastaSaida', next)
    },
    [store],
  )

  const userSelect = useRef(onUserSelect)
  userSelect.current = onUserSelect
  const selectSerial = useCallback((serial: string | null) => {
    userSelect.current?.()
    setSelectedSerial(serial)
  }, [])
  const selectCommand = useCallback((id: string | null) => {
    userSelect.current?.()
    setSelectedCommandId(id)
  }, [])

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
    currentDeviceDir,
    status,
    flash,
  }
}

export type AppState = ReturnType<typeof useAppState>
