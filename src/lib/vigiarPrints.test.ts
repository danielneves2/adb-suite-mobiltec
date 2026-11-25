import rawCatalog from '../../data/catalog.json'
import type { AdbApi, StreamEndEvent, StreamOutputEvent } from './adb'
import type { DeviceInfo } from './appLogic'
import type { Catalog, Command } from './catalogTypes'
import { runCommand, stopCommand, type RunEvent, type RunOptions } from './runCommand'

const catalog = rawCatalog as unknown as Catalog
const byId = (id: string) => catalog.comandos.find((c) => c.id === id) as Command
const a13: DeviceInfo = { serial: 'RQ8T', state: 'device', brand: 'Samsung', model: 'SM-A135M', android: '14' }
const opts: RunOptions = { device: a13, value: '', baseDir: 'C:\\Saidas', now: new Date(), runId: 'w1' }
const DIR = 'C:\\Saidas\\Samsung-SM-A135M_RQ8T'

test('catálogo: comando de vigiar prints fica em Captura, gera arquivo e roda no modo vigiar_prints', () => {
  expect(byId('vigiarprints')).toMatchObject({ categoria: 'Captura', modo: 'vigiar_prints', gera_arquivo: true, parametro: null })
})

test('vigiar prints começa o vigia com serial e pasta do aparelho, mostra as linhas e termina no fim', async () => {
  let onLines: (e: StreamOutputEvent) => void = () => {}
  let onEnd: (e: StreamEndEvent) => void = () => {}
  const api = {
    onStreamOutput: vi.fn(async (cb: typeof onLines) => ((onLines = cb), () => {})),
    onStreamEnd: vi.fn(async (cb: typeof onEnd) => ((onEnd = cb), () => {})),
    startWatchPrints: vi.fn(async () => {
      onLines({ runId: 'w1', lines: ['Print salvo: C:\\x\\prints\\s1.jpg'] })
      onEnd({ runId: 'w1', exitCode: 0, savedTo: null, error: null })
    }),
  } as unknown as AdbApi
  const events: RunEvent[] = []
  await runCommand(byId('vigiarprints'), opts, api, (e) => events.push(e))
  expect(api.startWatchPrints).toHaveBeenCalledWith('w1', 'RQ8T', DIR)
  expect(events).toContainEqual({ kind: 'lines', lines: ['Print salvo: C:\\x\\prints\\s1.jpg'] })
  expect(events.at(-1)).toMatchObject({ kind: 'done', result: { exitCode: 0 } })
})

test('Parar o vigia usa o stop do stream, sem passos extras', async () => {
  const api = { stopStream: vi.fn(async () => null), cancelRun: vi.fn() } as unknown as AdbApi
  await stopCommand(byId('vigiarprints'), opts, api)
  expect(api.stopStream).toHaveBeenCalledWith('w1', null, null)
  expect(api.cancelRun).not.toHaveBeenCalled()
})
