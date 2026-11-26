import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Command } from '../lib/catalogTypes'
import { applyChanges, mergeCatalog, type CommandCache } from '../lib/sync'
import { TeamApiError, type TeamApi } from '../lib/teamApi'
import type { ConfigStore } from './useAppState'

/** local = sem servidor neste build; syncing = primeira leitura; online/offline = Ãºltimo contato. */
export type SyncStatus = 'local' | 'syncing' | 'online' | 'offline'

export interface TeamSyncDeps {
  /** null = sem servidor configurado: tudo fica sÃ³ neste PC. */
  api: TeamApi | null
  store: ConfigStore
  embedded: Command[]
  user: string | null
  pollMs?: number
}

const CACHE_KEY = 'catalogo'
const SYNC_KEY = 'ultimoSync'

/**
 * CatÃ¡logo do time: embutido + cache do servidor, sincronizado a cada `pollMs`.
 * TambÃ©m sobe (uma vez) os comandos criados antes da sincronizaÃ§Ã£o existir.
 */
export function useTeamSync({ api, store, embedded, user, pollMs = 30_000 }: TeamSyncDeps) {
  const [cache, setCache] = useState<CommandCache>({})
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState<SyncStatus>(api ? 'syncing' : 'local')
  const cacheRef = useRef<CommandCache>({})
  const lastSync = useRef<string | null>(null)
  const userRef = useRef(user)
  userRef.current = user
  const migrating = useRef(false)
  const inflight = useRef<Promise<void> | null>(null)

  const commit = useCallback(
    (next: CommandCache) => {
      cacheRef.current = next
      setCache(next)
      void store.set(CACHE_KEY, next).catch(() => {})
    },
    [store],
  )

  // Cache salvo: o catÃ¡logo aparece na hora, antes da rede.
  useEffect(() => {
    void (async () => {
      let saved: CommandCache = {}
      try {
        saved = (await store.get<CommandCache>(CACHE_KEY)) ?? {}
        lastSync.current = (await store.get<string>(SYNC_KEY)) || null
      } catch {
        // cache corrompido: comeÃ§a do embutido e o sync traz tudo de novo
        lastSync.current = null
      }
      cacheRef.current = saved
      setCache(saved)
      setLoaded(true)
    })()
  }, [store])

  /** Cria ou atualiza (no servidor, ou sÃ³ neste PC sem servidor). Falha sem internet: nada muda. */
  const save = useCallback(
    async (cs: Command[]) => {
      if (!api) {
        const now = new Date().toISOString()
        commit(applyChanges(cacheRef.current, cs.map((c) => ({ ...c, atualizado_em: now }))))
        return
      }
      const u = userRef.current
      if (!u) throw new TeamApiError('Entre com seu nome antes de salvar.', false)
      const saved: Command[] = []
      try {
        for (const c of cs) saved.push(await api.save(c, u))
      } catch (e) {
        if (e instanceof TeamApiError && e.offline) setStatus('offline')
        throw e
      } finally {
        if (saved.length) commit(applyChanges(cacheRef.current, saved))
      }
      setStatus('online')
    },
    [api, commit],
  )

  /** ExclusÃ£o lÃ³gica. */
  const remove = useCallback(
    async (id: string) => {
      if (!api) {
        const current = cacheRef.current[id] ?? embedded.find((c) => c.id === id)
        if (current) commit(applyChanges(cacheRef.current, [{ ...current, excluido: true, atualizado_em: new Date().toISOString() }]))
        return
      }
      const u = userRef.current
      if (!u) throw new TeamApiError('Entre com seu nome antes de excluir.', false)
      try {
        commit(applyChanges(cacheRef.current, [await api.remove(id, u)]))
      } catch (e) {
        if (e instanceof TeamApiError && e.offline) setStatus('offline')
        throw e
      }
    },
    [api, commit, embedded],
  )

  /** Comandos de antes da sincronizaÃ§Ã£o (por perfil e os de antes dos perfis) vÃ£o pro catÃ¡logo do time. */
  const migrate = useCallback(async () => {
    const u = userRef.current
    if (!u || migrating.current) return
    migrating.current = true
    try {
      for (const key of [`meusComandos@${u.toLowerCase()}`, 'meusComandos']) {
        const list = await store.get<Command[]>(key)
        if (!Array.isArray(list) || list.length === 0) continue
        const pending = list.filter((c) => !c.excluido)
        if (pending.length) await save(pending)
        await store.set(key, [])
      }
    } catch {
      // sem conexÃ£o no meio: o que faltou sobe no prÃ³ximo sync (salvar de novo nÃ£o duplica)
    } finally {
      migrating.current = false
    }
  }, [store, save])

  const syncNow = useCallback((): Promise<void> => {
    if (!api) return Promise.resolve()
    if (inflight.current) return inflight.current
    const run = (async () => {
      try {
        const r = await api.changes(lastSync.current)
        if (r.commands.length) commit(applyChanges(cacheRef.current, r.commands))
        lastSync.current = r.serverNow
        void store.set(SYNC_KEY, r.serverNow).catch(() => {})
        setStatus('online')
      } catch {
        setStatus('offline')
        return
      }
      await migrate()
    })()
    inflight.current = run
    void run.finally(() => {
      inflight.current = null
    })
    return run
  }, [api, commit, store, migrate])

  // Polling (sÃ³ com servidor).
  useEffect(() => {
    if (!loaded || !api) return
    void syncNow()
    const id = setInterval(() => void syncNow(), pollMs)
    return () => clearInterval(id)
  }, [loaded, api, pollMs, syncNow])

  // Entrou/trocou de perfil: registra o nome e sobe os comandos antigos dele.
  useEffect(() => {
    if (!loaded || !user) return
    if (!api) {
      void migrate()
      return
    }
    api.enter(user).catch(() => {})
    void syncNow()
  }, [loaded, user, api, migrate, syncNow])

  const commands = useMemo(() => mergeCatalog(embedded, cache), [embedded, cache])

  return { commands, status, save, remove, syncNow }
}
