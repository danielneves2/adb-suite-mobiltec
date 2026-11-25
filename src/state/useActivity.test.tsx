// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import type { DeviceInfo } from '../lib/appLogic'
import { useActivity } from './useActivity'

const a13: DeviceInfo = { serial: 'RQ8T', state: 'device', brand: 'Samsung', model: 'SM-A135M', android: '14' }

test('trackDevices registra conexão e desconexão; log empilha', () => {
  const { result } = renderHook(() => useActivity())
  act(() => result.current.trackDevices([a13]))
  act(() => result.current.trackDevices([a13]))
  act(() => result.current.log('CMD', 'Extrair APK — concluído em 0,6 s'))
  act(() => result.current.trackDevices([]))
  expect(result.current.entries.map((e) => `${e.tag} ${e.text}`)).toEqual([
    'ADB Aparelho desconectado: RQ8T',
    'CMD Extrair APK — concluído em 0,6 s',
    'ADB Aparelho conectado: Samsung SM-A135M (RQ8T)',
  ])
})
