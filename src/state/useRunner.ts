import { useCallback, useRef, useState } from 'react'
import type { AdbApi, StepOut } from '../lib/adb'
import type { DeviceInfo } from '../lib/appLogic'
import type { Command } from '../lib/catalogTypes'
import { runCommand, runFreeCommand, stopCommand, type RunEvent, type RunOptions, type RunResult } from '../lib/runCommand'

/** Painel de saída guarda só as últimas linhas de um comando contínuo. */
export const MAX_LINES = 5000

export type RunPhase = 'idle' | 'running' | 'done' | 'error'

export interface RunView {
  phase: RunPhase
  display: string | null
  lines: string[]
  result: RunResult | null
  error: string | null
  /** Saída do passo final depois de Parar (ex.: pull do vídeo). */
  extra: string
}

const IDLE: RunView = { phase: 'idle', display: null, lines: [], result: null, error: null, extra: '' }

export interface StartOptions {
  device: DeviceInfo
  value: string
  baseDir: string
  allowEmptyValue?: boolean
}

interface Deps {
  api: AdbApi
  runFn?: typeof runCommand
  freeFn?: typeof runFreeCommand
  stopFn?: typeof stopCommand
}

const newRunId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

export function useRunner({ api, runFn = runCommand, freeFn = runFreeCommand, stopFn = stopCommand }: Deps) {
  const [view, setView] = useState<RunView>(IDLE)
  const current = useRef<{ runId: string; command: Command | null; opts: RunOptions; active: boolean; stopping: boolean } | null>(null)

  /** Para (ou roda o passo final de) uma execução e anexa a saída desse passo, se ainda for a atual. */
  const halt = useCallback(
    async (run: NonNullable<typeof current.current>) => {
      if (run.stopping) return
      run.stopping = true
      try {
        const out: StepOut | null = await stopFn(run.command, run.opts, api)
        if (out && current.current?.runId === run.runId) {
          const text = out.stdout + out.stderr
          setView((v) => ({ ...v, extra: v.extra + text }))
        }
      } catch (e) {
        if (current.current?.runId === run.runId) setView((v) => ({ ...v, phase: 'error', error: String(e) }))
      }
    },
    [api, stopFn],
  )

  /** Execução abandonada (trocou de comando, rodou outro, reset): não pode ficar rodando sozinha. */
  const abandon = () => {
    const prev = current.current
    if (prev?.active) void halt(prev)
  }

  const handlerFor = useCallback(
    (runId: string) => (e: RunEvent) => {
      const run = current.current
      if (run?.runId !== runId) return // execução antiga: ignora
      if (e.kind === 'done' || e.kind === 'error') {
        run.active = false
        // Contínuo que terminou sozinho (ex.: gravação chegou ao limite): roda o passo final mesmo assim.
        if (e.kind === 'done' && run.command?.comando_depois) void halt(run)
      }
      setView((v) => {
        switch (e.kind) {
          case 'started':
            return { ...v, display: e.display }
          case 'lines': {
            const lines = v.lines.concat(e.lines)
            return { ...v, lines: lines.length > MAX_LINES ? lines.slice(lines.length - MAX_LINES) : lines }
          }
          case 'done':
            return { ...v, phase: 'done', display: v.display ?? e.result.display, result: e.result }
          case 'error':
            return { ...v, phase: 'error', error: e.message }
        }
      })
    },
    [halt],
  )

  const begin = (command: Command | null, o: StartOptions): RunOptions => {
    abandon()
    const opts: RunOptions = { ...o, now: new Date(), runId: newRunId() }
    current.current = { runId: opts.runId, command, opts, active: true, stopping: false }
    setView({ ...IDLE, phase: 'running' })
    return opts
  }

  const start = useCallback(
    (command: Command, o: StartOptions) => {
      const opts = begin(command, o)
      void runFn(command, opts, api, handlerFor(opts.runId))
    },
    [api, runFn, handlerFor],
  )

  const startFree = useCallback(
    (input: string, o: Omit<StartOptions, 'value'>) => {
      const opts = begin(null, { ...o, value: '' })
      void freeFn(input, opts, api, handlerFor(opts.runId))
    },
    [api, freeFn, handlerFor],
  )

  const stop = useCallback(async () => {
    const run = current.current
    if (run) await halt(run)
  }, [halt])

  const reset = useCallback(() => {
    abandon()
    current.current = null
    setView(IDLE)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- abandon só usa refs e halt
  }, [halt])

  // A saída extra (passo depois de Parar) entra no fim da saída do resultado.
  const merged: RunView =
    view.result && view.extra ? { ...view, result: { ...view.result, output: view.result.output + view.extra } } : view

  return { view: merged, start, startFree, stop, reset }
}
