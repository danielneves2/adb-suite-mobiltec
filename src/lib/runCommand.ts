// Orquestra a execução de um comando do catálogo (ou do comando livre) decidindo só por dados:
// `modo`, `acao_extra`, `comando_parar`, `comando_depois`.
import type { AdbApi, StepOut } from './adb'
import { deviceDir, type DeviceInfo } from './appLogic'
import type { Command } from './catalogTypes'
import { buildCommand, buildFreeCommand, type BuildContext, type BuildResult, type Step } from './commandBuilder'
import { BuildError } from './tokenize'
import { cleanValue } from './valueClean'

export interface RunResult {
  output: string
  exitCode: number
  durationMs: number
  savedTo?: string
  display: string
  at: Date
}

export type RunEvent =
  | { kind: 'started'; display: string }
  | { kind: 'lines'; lines: string[] }
  | { kind: 'done'; result: RunResult }
  | { kind: 'error'; message: string }

export interface RunOptions {
  device: DeviceInfo
  value: string
  baseDir: string
  now: Date
  runId: string
  /** O valor veio de um atalho/opção que pode ser vazio (ex.: "Reiniciar → Normal"). */
  allowEmptyValue?: boolean
}

type Api = Pick<
  AdbApi,
  'runSteps' | 'cancelRun' | 'startStream' | 'stopStream' | 'onStreamOutput' | 'onStreamEnd' | 'copyImageToClipboard' | 'zipFolder' | 'openTerminal'
>

const context = (o: RunOptions): BuildContext => ({ serial: o.device.serial, value: o.value, deviceDir: deviceDir(o.baseDir, o.device), now: o.now })

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

const parentDir = (path: string) => path.replace(/[\\/][^\\/]*$/, '')

/** stdout de todos os passos e, no fim, os stderr. */
function joinOutput(outs: StepOut[]): string {
  return outs.map((o) => o.stdout).join('') + outs.map((o) => o.stderr).join('')
}

async function finishNormal(c: Command | null, built: BuildResult, outs: StepOut[], o: RunOptions, api: Api): Promise<RunResult> {
  const last = outs.at(-1)
  const savedTo = [...outs].reverse().find((x) => x.savedTo)?.savedTo ?? undefined
  let output = joinOutput(outs)
  const ok = !!last && last.exitCode === 0

  if (ok && savedTo && c?.acao_extra === 'copiar_imagem') {
    await api.copyImageToClipboard(savedTo)
    output += `Imagem copiada.\nTambém salva em: ${savedTo}\n`
  } else if (ok && c?.acao_extra === 'zipar') {
    const firstSaved = outs.find((x) => x.savedTo)?.savedTo
    if (firstSaved) {
      const dir = parentDir(firstSaved)
      const zip = await api.zipFolder(dir, `${dir}.zip`)
      output += `Compactado em: ${zip}\n`
      return { output, exitCode: 0, durationMs: sum(outs), savedTo: zip, display: built.display, at: o.now }
    }
  } else if (ok && savedTo && output.trim() === '') {
    output = `Salvo em: ${savedTo}\n`
  }

  return { output, exitCode: last?.exitCode ?? -1, durationMs: sum(outs), savedTo, display: built.display, at: o.now }
}

const sum = (outs: StepOut[]) => outs.reduce((t, x) => t + x.durationMs, 0)

async function runStream(built: BuildResult, o: RunOptions, api: Api, emit: (e: RunEvent) => void): Promise<void> {
  const started = Date.now()
  let resolveEnd: () => void = () => {}
  const ended = new Promise<void>((r) => (resolveEnd = r))
  const unlistenLines = await api.onStreamOutput((e) => {
    if (e.runId === o.runId) emit({ kind: 'lines', lines: e.lines })
  })
  const unlistenEnd = await api.onStreamEnd((e) => {
    if (e.runId !== o.runId) return
    if (e.error) emit({ kind: 'error', message: e.error })
    else
      emit({
        kind: 'done',
        result: {
          output: e.savedTo ? `Salvo em: ${e.savedTo}\n` : '',
          exitCode: e.exitCode,
          durationMs: Date.now() - started,
          savedTo: e.savedTo ?? undefined,
          display: built.display,
          at: o.now,
        },
      })
    resolveEnd()
  })
  try {
    await api.startStream(o.runId, built.steps[0], context(o).deviceDir)
    await ended
  } finally {
    unlistenLines()
    unlistenEnd()
  }
}

/** Roda um comando do catálogo/time no aparelho de `o.device`. */
export async function runCommand(c: Command, raw: RunOptions, api: Api, emit: (e: RunEvent) => void): Promise<void> {
  const o: RunOptions = { ...raw, value: cleanValue(c.parametro, raw.value) }
  try {
    if (c.modo === 'terminal') {
      emit({ kind: 'started', display: `adb -s ${o.device.serial} shell` })
      await api.openTerminal(o.device.serial)
      emit({ kind: 'done', result: { output: 'Terminal aberto em outra janela.\n', exitCode: 0, durationMs: 0, display: `adb -s ${o.device.serial} shell`, at: o.now } })
      return
    }
    const built = buildCommand(c.comando, context(o), { requiresValue: c.parametro !== null, allowEmptyValue: o.allowEmptyValue })
    emit({ kind: 'started', display: built.display })
    if (c.modo === 'continuo') {
      await runStream(built, o, api, emit)
      return
    }
    const outs = await api.runSteps(o.runId, built.steps, context(o).deviceDir)
    emit({ kind: 'done', result: await finishNormal(c, built, outs, o, api) })
  } catch (e) {
    emit({ kind: 'error', message: e instanceof BuildError ? e.message : errorMessage(e) })
  }
}

/** Comando livre digitado pelo técnico. */
export async function runFreeCommand(input: string, o: RunOptions, api: Api, emit: (e: RunEvent) => void): Promise<void> {
  try {
    const built = buildFreeCommand(input, context(o))
    emit({ kind: 'started', display: built.display })
    const outs = await api.runSteps(o.runId, built.steps, context(o).deviceDir)
    emit({ kind: 'done', result: await finishNormal(null, built, outs, o, api) })
  } catch (e) {
    emit({ kind: 'error', message: errorMessage(e) })
  }
}

const firstStep = (template: string | null | undefined, ctx: BuildContext): Step | null =>
  template ? buildCommand(template, ctx).steps[0] : null

/** Botão Parar: contínuo → para o stream (com comando de parada/depois); normal → cancela. */
export async function stopCommand(c: Command | null, o: RunOptions, api: Pick<AdbApi, 'stopStream' | 'cancelRun'>): Promise<StepOut | null> {
  if (c?.modo === 'continuo') {
    const ctx = context(o)
    return api.stopStream(o.runId, firstStep(c.comando_parar, ctx), firstStep(c.comando_depois, ctx))
  }
  await api.cancelRun(o.runId)
  return null
}
