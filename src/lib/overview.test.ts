import type { DeviceInfo } from './appLogic'
import { deviceEvents, deviceStatus, formatClock, pushActivity, transportOf, type ActivityEntry } from './overview'

const a13: DeviceInfo = { serial: 'RQ8T502DZEH', state: 'device', brand: 'Samsung', model: 'SM-A135M', android: '14' }
const at = new Date(2026, 10, 25, 14, 28, 11)

test('transporte: USB, ou Wi-Fi quando o serial é IP:porta ou adb-tls', () => {
  expect(transportOf('RQ8T502DZEH')).toBe('USB')
  expect(transportOf('192.168.0.10:5555')).toBe('Wi-Fi')
  expect(transportOf('adb-RQ8T502DZEH-AbCd._adb-tls-connect._tcp')).toBe('Wi-Fi')
})

test('status do aparelho', () => {
  expect(deviceStatus(a13)).toEqual({ tone: 'ok', label: 'Conectado' })
  expect(deviceStatus({ serial: 'X', state: 'unauthorized' })).toEqual({ tone: 'alerta', label: 'Não autorizado' })
  expect(deviceStatus({ serial: 'X', state: 'offline' })).toEqual({ tone: 'erro', label: 'Offline' })
  expect(deviceStatus({ serial: 'X', state: 'recovery' })).toEqual({ tone: 'erro', label: 'recovery' })
  expect(deviceStatus(null)).toEqual({ tone: 'vazio', label: 'Sem aparelho' })
})

describe('eventos de aparelho', () => {
  test('aparelho novo pronto', () => {
    expect(deviceEvents([], [a13], at)).toEqual([{ at, tag: 'ADB', text: 'Aparelho conectado: Samsung SM-A135M (RQ8T502DZEH)' }])
  })
  test('aparelho que sumiu', () => {
    expect(deviceEvents([a13], [], at)).toEqual([{ at, tag: 'ADB', text: 'Aparelho desconectado: RQ8T502DZEH' }])
  })
  test('aguardando autorização, e depois autorizado', () => {
    const pend: DeviceInfo = { serial: 'RQ8T502DZEH', state: 'unauthorized' }
    expect(deviceEvents([], [pend], at)).toEqual([{ at, tag: 'ADB', text: 'Aparelho aguardando autorização: RQ8T502DZEH' }])
    expect(deviceEvents([pend], [a13], at)).toEqual([{ at, tag: 'ADB', text: 'Aparelho conectado: Samsung SM-A135M (RQ8T502DZEH)' }])
  })
  test('nada muda, nada acontece', () => {
    expect(deviceEvents([a13], [{ ...a13 }], at)).toEqual([])
  })
})

test('pushActivity põe o mais recente primeiro e corta em 50', () => {
  const e = (n: number): ActivityEntry => ({ at, tag: 'CMD', text: `c${n}` })
  let list: ActivityEntry[] = []
  for (let i = 0; i < 60; i++) list = pushActivity(list, [e(i)])
  expect(list).toHaveLength(50)
  expect(list[0].text).toBe('c59')
  expect(pushActivity([e(1)], [e(2), e(3)]).map((x) => x.text)).toEqual(['c3', 'c2', 'c1'])
})

test('formatClock', () => {
  expect(formatClock(new Date(2026, 0, 1, 9, 5, 3))).toBe('09:05:03')
})
