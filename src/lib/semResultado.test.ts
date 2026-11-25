import rawCatalog from '../../data/catalog.json'
import type { AdbApi, StepOut } from './adb'
import type { DeviceInfo } from './appLogic'
import type { Catalog, Command } from './catalogTypes'
import { runCommand, type RunEvent, type RunOptions } from './runCommand'

const catalog = rawCatalog as unknown as Catalog
const byId = (id: string) => catalog.comandos.find((c) => c.id === id) as Command
const a13: DeviceInfo = { serial: 'RQ8T', state: 'device', brand: 'Samsung', model: 'SM-A135M', android: '14' }
const opts: RunOptions = { device: a13, value: 'com.whatsapp', baseDir: 'C:\\Saidas', now: new Date(), runId: 'r1' }

async function run(c: Command, out: Partial<StepOut>) {
  const runSteps = vi.fn(async () => [{ stdout: '', stderr: '', exitCode: 0, durationMs: 10, savedTo: null, ...out }])
  const events: RunEvent[] = []
  await runCommand(c, opts, { runSteps } as unknown as AdbApi, (e) => events.push(e))
  return events.at(-1)
}

test('grep que não acha nada (código 1, sem saída) não é erro: mostra o texto do catálogo', async () => {
  expect(byId('rodando').texto_sem_resultado).toBe('O app não está rodando.')
  expect(await run(byId('rodando'), { exitCode: 1 })).toMatchObject({ kind: 'done', result: { exitCode: 0, output: 'O app não está rodando.\n' } })
})

test('sem texto no catálogo, comando com grep mostra "Nada encontrado."', async () => {
  expect(await run(byId('versao'), { exitCode: 1 })).toMatchObject({ kind: 'done', result: { exitCode: 0, output: 'Nada encontrado.\n' } })
})

test('código 1 com mensagem de erro continua sendo erro', async () => {
  expect(await run(byId('rodando'), { exitCode: 1, stderr: "error: device 'RQ8T' not found\n" })).toMatchObject({ result: { exitCode: 1 } })
})

test('comando sem grep com código 1 continua sendo erro', async () => {
  expect(await run(byId('desinstalar'), { exitCode: 1 })).toMatchObject({ result: { exitCode: 1 } })
})
