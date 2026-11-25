import rawCatalog from '../../data/catalog.json'
import type { AdbApi } from './adb'
import type { DeviceInfo } from './appLogic'
import type { Catalog, Command } from './catalogTypes'
import { runCommand, type RunEvent, type RunOptions } from './runCommand'
import { cleanValue } from './valueClean'

const catalog = rawCatalog as unknown as Catalog
const byId = (id: string) => catalog.comandos.find((c) => c.id === id) as Command

describe('cleanValue', () => {
  test('arquivo/caminho colado com "Copiar como caminho" perde as aspas e os espaços das pontas', () => {
    expect(cleanValue('apk', ' "C:\\Users\\x\\app.apk" ')).toBe('C:\\Users\\x\\app.apk')
    expect(cleanValue('file', "'C:\\a b\\c.txt'")).toBe('C:\\a b\\c.txt')
    expect(cleanValue('path', '"/sdcard/Download/a b.txt"')).toBe('/sdcard/Download/a b.txt')
  })
  test('aspas que não fecham, ou no meio, ficam como estão', () => {
    expect(cleanValue('apk', '"C:\\x.apk')).toBe('"C:\\x.apk')
    expect(cleanValue('file', 'C:\\"a"\\b.txt')).toBe('C:\\"a"\\b.txt')
  })
  test('pacote e texto livre só perdem os espaços das pontas (texto pode ter aspas de propósito)', () => {
    expect(cleanValue('pkg', '  com.whatsapp ')).toBe('com.whatsapp')
    expect(cleanValue('text', '"oi"')).toBe('"oi"')
    expect(cleanValue(null, ' x ')).toBe(' x ')
  })
})

test('instalar APK com caminho entre aspas manda o caminho limpo pro adb', async () => {
  const a13: DeviceInfo = { serial: 'RQ8T', state: 'device', brand: 'Samsung', model: 'SM-A135M', android: '14' }
  const runSteps = vi.fn(async () => [{ stdout: 'Success\n', stderr: '', exitCode: 0, durationMs: 10, savedTo: null }])
  const api = { runSteps } as unknown as AdbApi
  const opts: RunOptions = { device: a13, value: '"C:\\Users\\M\\com.facebook.katana.apk"', baseDir: 'C:\\Saidas', now: new Date(), runId: 'r1' }
  const events: RunEvent[] = []
  await runCommand(byId('instalar'), opts, api, (e) => events.push(e))
  const steps = (runSteps.mock.calls[0] as unknown as [string, { args: string[] }[]])[1]
  expect(steps[0].args).toEqual(['-s', 'RQ8T', 'install', '-r', 'C:\\Users\\M\\com.facebook.katana.apk'])
})
