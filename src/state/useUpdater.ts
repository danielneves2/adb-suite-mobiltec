import { useCallback, useEffect, useRef, useState } from 'react'
import { progressPercent, type AvailableUpdate, type UpdaterApi } from '../lib/updater'

export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'none' }
  | { kind: 'available'; version: string; notes: string | null }
  | { kind: 'downloading'; version: string; percent: number | null }
  | { kind: 'restarting' }
  | { kind: 'error'; message: string }

const CHECK_FAILED = 'Não deu pra procurar atualização (sem internet ou sem versão publicada).'

export interface UpdaterOptions {
  /** Procura sozinho ao abrir o app. */
  autoCheck?: boolean
  /** Se a procura ao abrir achar versão nova, instala e reabre sem perguntar (ninguém está no meio de um comando). */
  installOnStart?: boolean
  /** Com o app aberto, procura de novo a cada tantos ms, em silêncio; se achar, só mostra o botão. */
  recheckMs?: number
}

/** Procura versão nova (ao abrir e de tempos em tempos) e instala sozinho ao abrir ou com um clique. */
export function useUpdater(api: UpdaterApi, opts: UpdaterOptions = {}) {
  const [state, setState] = useState<UpdateState>({ kind: 'idle' })
  const found = useRef<AvailableUpdate | null>(null)
  const installing = useRef(false)

  const install = useCallback(
    async (auto = false) => {
      const update = found.current
      if (!update || installing.current) return
      installing.current = true
      setState({ kind: 'downloading', version: update.version, percent: null })
      try {
        await update.install((p) => setState({ kind: 'downloading', version: update.version, percent: progressPercent(p.downloaded, p.total) }))
        setState({ kind: 'restarting' })
        await api.relaunch()
      } catch (e) {
        installing.current = false
        // Sozinho ao abrir: o técnico nem pediu; volta o botão pra ele tentar quando quiser.
        if (auto) setState({ kind: 'available', version: update.version, notes: update.notes })
        else setState({ kind: 'error', message: `Não deu pra atualizar: ${e instanceof Error ? e.message : String(e)}` })
      }
    },
    [api],
  )

  const run = useCallback(
    async (silent: boolean): Promise<AvailableUpdate | null> => {
      if (!silent) setState({ kind: 'checking' })
      try {
        const update = await api.check()
        if (installing.current) return null // começou a instalar enquanto procurava
        found.current = update
        if (update) setState({ kind: 'available', version: update.version, notes: update.notes })
        else if (!silent) setState({ kind: 'none' })
        return update
      } catch {
        // Em silêncio (sem internet ou sem release publicada): nada pra mostrar.
        if (!silent) setState({ kind: 'error', message: CHECK_FAILED })
        return null
      }
    },
    [api],
  )

  const autoCheck = !!opts.autoCheck
  const installOnStart = !!opts.installOnStart
  useEffect(() => {
    if (!autoCheck) return
    void run(true).then((update) => {
      if (update && installOnStart) void install(true)
    })
  }, [autoCheck, installOnStart, run, install])

  const recheckMs = opts.recheckMs
  useEffect(() => {
    if (!recheckMs) return
    const timer = setInterval(() => {
      if (!installing.current) void run(true)
    }, recheckMs)
    return () => clearInterval(timer)
  }, [recheckMs, run])

  const check = useCallback(() => run(false).then(() => {}), [run])
  const installNow = useCallback(() => install(false), [install])

  return { state, check, install: installNow }
}
