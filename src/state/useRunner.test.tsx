// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import rawCatalog from '../../data/catalog.json'
import type { DeviceInfo } from '../lib/appLogic'
import type { Catalog, Command } from '../lib/catalogTypes'
import type { RunEvent } from '../lib/runCommand'
import { MAX_LINES, useRunner } from './useRunner'

const catalog = rawCatalog as unknown as Catalog
const byId = (id: string) => catalog.comandos.find((c) => c.id === id) as Command
const a54: DeviceInfo = { serial: 'R58N', state: 'device', brand: 'Samsung', model: 'Galaxy A54', android: '14' }
const base = { device: a54, value: '', baseDir: 'C:\\Saidas' }

function setup() {
  const emits: ((e: RunEvent) => void)[] = []
  const runFn = vi.fn((_c: Command, _o: unknown, _api: unknown, emit: (e: RunEvent) => void) => {
    emits.push(emit)
    return new Promise<void>(() => {})
  })
  const stopFn = vi.fn(async () => null)
  const hook = renderHook(() => useRunner({ api: {} as never, runFn, freeFn: runFn as never, stopFn }))
  return { hook, emits, runFn, stopFn }
}

const done = (output: string, exitCode = 0): RunEvent => ({
  kind: 'done',
  result: { output, exitCode, durationMs: 600, display: 'adb x', at: new Date(2026, 10, 24, 14, 32) },
})

test('fluxo aguardando → executando → concluído', () => {
  const { hook, emits } = setup()
  expect(hook.result.current.view.phase).toBe('idle')
  act(() => hook.result.current.start(byId('foco'), base))
  expect(hook.result.current.view.phase).toBe('running')
  act(() => emits[0]({ kind: 'started', display: 'adb -s R58N shell x' }))
  act(() => emits[0](done('ok')))
  expect(hook.result.current.view).toMatchObject({ phase: 'done', display: 'adb -s R58N shell x', result: { output: 'ok' } })
})

test('resultado de execução antiga é ignorado', () => {
  const { hook, emits } = setup()
  act(() => hook.result.current.start(byId('foco'), base))
  act(() => hook.result.current.start(byId('bateria'), { ...base, device: { ...a54, serial: 'OUTRO' } }))
  act(() => emits[0](done('do aparelho antigo')))
  expect(hook.result.current.view.phase).toBe('running')
  act(() => emits[1](done('certo')))
  expect(hook.result.current.view.result?.output).toBe('certo')
})

test('reset volta a aguardando e ignora o que chegar depois', () => {
  const { hook, emits } = setup()
  act(() => hook.result.current.start(byId('foco'), base))
  act(() => hook.result.current.reset())
  act(() => emits[0](done('tarde')))
  expect(hook.result.current.view.phase).toBe('idle')
})

test(`linhas contínuas ficam limitadas às últimas ${MAX_LINES}`, () => {
  const { hook, emits } = setup()
  act(() => hook.result.current.start(byId('logcontinuo'), base))
  act(() => emits[0]({ kind: 'lines', lines: Array.from({ length: MAX_LINES }, (_, i) => `l${i}`) }))
  act(() => emits[0]({ kind: 'lines', lines: ['nova'] }))
  const lines = hook.result.current.view.lines
  expect(lines).toHaveLength(MAX_LINES)
  expect(lines.at(-1)).toBe('nova')
  expect(lines[0]).toBe('l1')
})

test('erro vira fase de erro com a mensagem', () => {
  const { hook, emits } = setup()
  act(() => hook.result.current.start(byId('foco'), base))
  act(() => emits[0]({ kind: 'error', message: 'Preencha o valor antes de executar.' }))
  expect(hook.result.current.view).toMatchObject({ phase: 'error', error: 'Preencha o valor antes de executar.' })
})

test('parar chama stopFn com o comando e o runId atual e anexa a saída do passo final', async () => {
  const { hook, emits, stopFn } = setup()
  stopFn.mockResolvedValueOnce({ stdout: '1 file pulled\n', stderr: '', exitCode: 0, durationMs: 10, savedTo: null } as never)
  act(() => hook.result.current.start(byId('gravar'), base))
  await act(async () => hook.result.current.stop())
  expect(stopFn).toHaveBeenCalledWith(byId('gravar'), expect.objectContaining({ runId: expect.any(String) }), expect.anything())
  act(() => emits[0](done('')))
  expect(hook.result.current.view.result?.output).toContain('1 file pulled')
})

test('iniciar outro comando com um contínuo rodando para o anterior', () => {
  const { hook, stopFn } = setup()
  act(() => hook.result.current.start(byId('logcontinuo'), base))
  act(() => hook.result.current.start(byId('foco'), base))
  expect(stopFn).toHaveBeenCalledTimes(1)
  expect(stopFn).toHaveBeenCalledWith(byId('logcontinuo'), expect.anything(), expect.anything())
})

test('reset com execução em andamento para a anterior', () => {
  const { hook, stopFn } = setup()
  act(() => hook.result.current.start(byId('logcontinuo'), base))
  act(() => hook.result.current.reset())
  expect(stopFn).toHaveBeenCalledTimes(1)
})

test('reset depois de concluído não chama parar', () => {
  const { hook, emits, stopFn } = setup()
  act(() => hook.result.current.start(byId('foco'), base))
  act(() => emits[0](done('ok')))
  act(() => hook.result.current.reset())
  expect(stopFn).not.toHaveBeenCalled()
})

test('contínuo com passo final que termina sozinho roda o passo final (puxa o vídeo)', async () => {
  const { hook, emits, stopFn } = setup()
  stopFn.mockResolvedValueOnce({ stdout: '1 file pulled\n', stderr: '', exitCode: 0, durationMs: 10, savedTo: null } as never)
  act(() => hook.result.current.start(byId('gravar'), base))
  await act(async () => emits[0](done('')))
  expect(stopFn).toHaveBeenCalledTimes(1)
  expect(hook.result.current.view.result?.output).toContain('1 file pulled')
})

test('depois de Parar, o fim do stream não roda o passo final de novo, e Parar duas vezes para uma vez só', async () => {
  const { hook, emits, stopFn } = setup()
  act(() => hook.result.current.start(byId('gravar'), base))
  await act(async () => {
    void hook.result.current.stop()
    void hook.result.current.stop()
  })
  await act(async () => emits[0](done('')))
  expect(stopFn).toHaveBeenCalledTimes(1)
})

test('view expõe o runId e não muda de identidade entre renders sem mudança (saída extra mesclada)', async () => {
  const { hook, emits, stopFn } = setup()
  stopFn.mockResolvedValueOnce({ stdout: '1 file pulled\n', stderr: '', exitCode: 0, durationMs: 10, savedTo: null } as never)
  act(() => hook.result.current.start(byId('gravar'), base))
  const id = hook.result.current.view.runId
  expect(id).toEqual(expect.any(String))
  await act(async () => emits[0](done('')))
  const v1 = hook.result.current.view
  hook.rerender()
  expect(hook.result.current.view).toBe(v1)
  expect(v1.runId).toBe(id)
})
