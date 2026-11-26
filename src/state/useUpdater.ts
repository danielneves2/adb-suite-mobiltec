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

/** Procura versão nova (sozinho ao abrir, se `autoCheck`) e instala com um clique. */
export function useUpdater(api: UpdaterApi, opts: { autoCheck?: boolean } = {}) {
  const [state, setState] = useState<UpdateState>({ kind: 'idle' })
  const found = useRef<AvailableUpdate | null>(null)
  const installing = useRef(false)

  const run = useCallback(
    async (silent: boolean) => {
      if (!silent) setState({ kind: 'checking' })
      try {
        const update = await api.check()
        found.current = update
        if (update) setState({ kind: 'available', version: update.version, notes: update.notes })
        else if (!silent) setState({ kind: 'none' })
      } catch {
        // Ao abrir, sem internet ou sem release publicada: nada pra mostrar.
        if (!silent) setState({ kind: 'error', message: CHECK_FAILED })
      }
    },
    [api],
  )

  const autoCheck = !!opts.autoCheck
  useEffect(() => {
    if (autoCheck) void run(true)
  }, [autoCheck, run])

  const check = useCallback(() => run(false), [run])

  const install = useCallback(async () => {
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
      setState({ kind: 'error', message: `Não deu pra atualizar: ${e instanceof Error ? e.message : String(e)}` })
    }
  }, [api])

  return { state, check, install }
}
