import rawCatalog from '../../data/catalog.json'
import type { AdbApi, StepOut } from './adb'
import type { DeviceInfo } from './appLogic'
import type { Catalog, Command } from './catalogTypes'
import { runCommand, runFreeCommand, stopCommand, type RunEvent, type RunOptions } from './runCommand'

const catalog = rawCatalog as unknown as Catalog
const byId = (id: string) => catalog.comandos.find((c) => c.id === id) as Command
const a54: DeviceInfo = { serial: 'R58N', state: 'device', brand: 'Samsung', model: 'Galaxy A54', android: '14' }
const opts: RunOptions = { device: a54, value: '', baseDir: 'C:\\Saidas', now: new Date(2026, 10, 24, 14, 32, 5), runId: 'r1' }
const DIR = 'C:\\Saidas\\Samsung-Galaxy-A54_R58N'

const out = (o: Partial<StepOut> = {}): StepOut => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 100, savedTo: null, ...o })

function fakeApi(overrides: Partial<AdbApi> = {}) {
  const api = {
    runSteps: vi.fn(async () => [out({ stdout: 'ok\n' })]),
    cancelRun: vi.fn(async () => {}),
    startStream: vi.fn(async () => {}),
    stopStream: vi.fn(async () => null),
    onStreamOutput: vi.fn(async () => () => {}),
    onStreamEnd: vi.fn(async () => () => {}),
    copyImageToClipboard: vi.fn(async () => {}),
    zipFolder: vi.fn(async (_d: string, z: string) => z),
    openTerminal: vi.fn(async () => {}),
    ...overrides,
  }
  return api as typeof api & AdbApi
}

async function collect(fn: (emit: (e: RunEvent) => void) => Promise<void>) {
  const events: RunEvent[] = []
  await fn((e) => events.push(e))
  return events
}

test('comando normal roda os passos na pasta do aparelho e termina com a saída', async () => {
  const api = fakeApi()
  const events = await collect((emit) => runCommand(byId('foco'), opts, api, emit))
  expect(api.runSteps).toHaveBeenCalledWith('r1', expect.any(Array), DIR)
  expect(events[0]).toEqual({ kind: 'started', display: expect.stringContaining('adb -s R58N shell') })
  const done = events.at(-1)
  expect(done).toMatchObject({ kind: 'done', result: { output: 'ok\n', exitCode: 0, durationMs: 100 } })
})

test('print copia a imagem salva', async () => {
  const saved = `${DIR}\\screenshot_20261124_1432.png`
  const api = fakeApi({ runSteps: vi.fn(async () => [out({ savedTo: saved })]) })
  const events = await collect((emit) => runCommand(byId('print'), opts, api, emit))
  expect(api.copyImageToClipboard).toHaveBeenCalledWith(saved)
  expect(events.at(-1)).toMatchObject({ kind: 'done', result: { savedTo: saved, output: expect.stringContaining('Imagem copiada') } })
})

test('diagnóstico compacta a subpasta', async () => {
  const api = fakeApi({
    runSteps: vi.fn(async () => [out({ savedTo: `${DIR}\\diagnostico_20261124_1432\\logcat.txt` })]),
  })
  const events = await collect((emit) => runCommand(byId('diag'), opts, api, emit))
  expect(api.zipFolder).toHaveBeenCalledWith(`${DIR}\\diagnostico_20261124_1432`, `${DIR}\\diagnostico_20261124_1432.zip`)
  expect(events.at(-1)).toMatchObject({ kind: 'done', result: { output: expect.stringContaining('Compactado em:') } })
})

test('shell abre o terminal e nada mais', async () => {
  const api = fakeApi()
  await collect((emit) => runCommand(byId('shell'), opts, api, emit))
  expect(api.openTerminal).toHaveBeenCalledWith('R58N')
  expect(api.runSteps).not.toHaveBeenCalled()
})

test('log contínuo usa stream e termina no stream-end', async () => {
  let endCb: ((e: { runId: string; exitCode: number; savedTo: string | null; error: string | null }) => void) | undefined
  let linesCb: ((e: { runId: string; lines: string[] }) => void) | undefined
  const api = fakeApi({
    onStreamOutput: vi.fn(async (cb) => {
      linesCb = cb
      return () => {}
    }),
    onStreamEnd: vi.fn(async (cb) => {
      endCb = cb
      return () => {}
    }),
    startStream: vi.fn(async () => {
      linesCb?.({ runId: 'outro', lines: ['nao'] })
      linesCb?.({ runId: 'r1', lines: ['a', 'b'] })
      endCb?.({ runId: 'r1', exitCode: 0, savedTo: `${DIR}\\log20261124_1432.txt`, error: null })
    }),
  })
  const events = await collect((emit) => runCommand(byId('logcontinuo'), opts, api, emit))
  expect(api.startStream).toHaveBeenCalledWith('r1', expect.objectContaining({ redirectTo: `${DIR}\\log20261124_1432.txt` }), DIR)
  expect(events.filter((e) => e.kind === 'lines')).toEqual([{ kind: 'lines', lines: ['a', 'b'] }])
  expect(events.at(-1)).toMatchObject({ kind: 'done', result: { savedTo: `${DIR}\\log20261124_1432.txt` } })
})

test('parar gravação roda o comando de parada e o de depois', async () => {
  const pulled = out({ savedTo: null, stdout: '1 file pulled' })
  const api = fakeApi({ stopStream: vi.fn(async () => pulled) })
  expect(await stopCommand(byId('gravar'), opts, api)).toBe(pulled)
  expect(api.stopStream).toHaveBeenCalledWith(
    'r1',
    expect.objectContaining({ args: ['-s', 'R58N', 'shell', 'pkill', '-INT', 'screenrecord'] }),
    expect.objectContaining({ args: ['-s', 'R58N', 'pull', '/sdcard/gravacao.mp4', `${DIR}\\gravacao_20261124_1432.mp4`] }),
  )
})

test('parar comando normal cancela', async () => {
  const api = fakeApi()
  expect(await stopCommand(byId('bugreport'), opts, api)).toBeNull()
  expect(api.cancelRun).toHaveBeenCalledWith('r1')
})

test('valor vazio vira erro sem chamar o adb', async () => {
  const api = fakeApi()
  const events = await collect((emit) => runCommand(byId('desinstalar'), { ...opts, value: '' }, api, emit))
  expect(events).toEqual([{ kind: 'error', message: 'Preencha o valor antes de executar.' }])
  expect(api.runSteps).not.toHaveBeenCalled()
})

test('erro do adb vira done com o código e stderr no fim', async () => {
  const api = fakeApi({ runSteps: vi.fn(async () => [out({ stdout: 'x\n', stderr: 'error: device not found\n', exitCode: 3 })]) })
  const events = await collect((emit) => runCommand(byId('foco'), opts, api, emit))
  expect(events.at(-1)).toMatchObject({ kind: 'done', result: { exitCode: 3, output: 'x\nerror: device not found\n' } })
})

test('falha da chamada (ex.: Cancelado.) vira erro', async () => {
  const api = fakeApi({ runSteps: vi.fn(async () => Promise.reject('Cancelado.')) })
  const events = await collect((emit) => runCommand(byId('foco'), opts, api, emit))
  expect(events.at(-1)).toEqual({ kind: 'error', message: 'Cancelado.' })
})

test('comando livre normaliza e roda', async () => {
  const api = fakeApi()
  await collect((emit) => runFreeCommand('adb -s OUTRO shell getprop ro.build.version.sdk', opts, api, emit))
  expect(api.runSteps).toHaveBeenCalledWith('r1', [expect.objectContaining({ args: ['-s', 'R58N', 'shell', 'getprop', 'ro.build.version.sdk'] })], DIR)
})
