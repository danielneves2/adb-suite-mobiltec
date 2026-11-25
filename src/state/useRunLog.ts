import { useEffect, useRef } from 'react'
import { formatDuration } from '../lib/appLogic'
import type { ActivityEntry } from '../lib/overview'
import type { RunView } from './useRunner'

/** Registra no log de atividade o fim de cada execução, uma vez por execução (chave = runId). */
export function useRunLog(view: RunView, name: string, log: (tag: ActivityEntry['tag'], text: string) => void) {
  const logged = useRef<string | null>(null)
  useEffect(() => {
    if (!view.runId || logged.current === view.runId) return
    if (view.phase === 'done' && view.result) {
      logged.current = view.runId
      const ok = view.result.exitCode === 0
      log(ok ? 'CMD' : 'ERRO', ok ? `${name} — concluído em ${formatDuration(view.result.durationMs)}` : `${name} — erro (código ${view.result.exitCode})`)
    } else if (view.phase === 'error' && view.error) {
      logged.current = view.runId
      log('ERRO', `${name} — ${view.error.split('\n')[0]}`)
    }
  }, [view, name, log])
}
