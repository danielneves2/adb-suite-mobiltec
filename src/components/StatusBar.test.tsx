// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DeviceInfo } from '../lib/appLogic'
import { StatusBar } from './StatusBar'

const a13: DeviceInfo = { serial: 'RQ8T', state: 'device', brand: 'Samsung', model: 'SM-A135M', android: '14' }
const base = { deviceDir: 'C:\\Saidas\\Samsung-SM-A135M_RQ8T', baseDir: 'C:\\Saidas', onChangeBase: () => {}, onOpen: () => {}, message: null, deviceCount: 1, device: a13, adbOk: true }

test('estilo IDE: contagem, aparelho, Android, ADB OK e pasta', () => {
  render(<StatusBar {...base} />)
  const bar = screen.getByRole('contentinfo')
  expect(bar).toHaveTextContent('1 dispositivo conectado')
  expect(bar).toHaveTextContent('Samsung SM-A135M')
  expect(bar).toHaveTextContent('Android 14')
  expect(bar).toHaveTextContent('ADB: OK')
  expect(bar).toHaveTextContent('C:\\Saidas\\Samsung-SM-A135M_RQ8T')
})

test('plural, sem aparelho e ADB com erro', () => {
  render(<StatusBar {...base} deviceCount={2} device={null} adbOk={false} />)
  const bar = screen.getByRole('contentinfo')
  expect(bar).toHaveTextContent('2 dispositivos conectados')
  expect(bar).toHaveTextContent('ADB: erro')
  expect(bar).not.toHaveTextContent('Android')
})

test('Alterar… troca a pasta base', async () => {
  const user = userEvent.setup()
  const onChangeBase = vi.fn()
  render(<StatusBar {...base} onChangeBase={onChangeBase} />)
  await user.click(screen.getByRole('button', { name: 'Alterar…' }))
  const input = screen.getByRole('textbox', { name: 'Pasta de saída' })
  await user.clear(input)
  await user.type(input, 'D:\\Logs{Enter}')
  expect(onChangeBase).toHaveBeenCalledWith('D:\\Logs')
})
