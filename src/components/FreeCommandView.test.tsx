// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DeviceInfo } from '../lib/appLogic'
import type { RunView } from '../state/useRunner'
import { FreeCommandView, type FreeCommandViewProps } from './FreeCommandView'

const a13: DeviceInfo = { serial: 'RQ8T', state: 'device', brand: 'Samsung', model: 'SM-A135M', android: '14' }
const idle: RunView = { phase: 'idle', display: null, lines: [], result: null, error: null, extra: '' }

const props = (over: Partial<FreeCommandViewProps> = {}): FreeCommandViewProps => ({
  device: a13,
  run: idle,
  onRunFree: vi.fn(),
  onStop: vi.fn(),
  onSaveAsCommand: vi.fn(),
  onOpenFolder: vi.fn(),
  onSaveOutput: vi.fn(),
  onRestartServer: vi.fn(),
  flash: vi.fn(),
  ...over,
})

test('título, prefixo com o serial e saída própria', () => {
  render(<FreeCommandView {...props()} />)
  expect(screen.getByRole('heading', { name: 'Comando livre' })).toBeInTheDocument()
  expect(screen.getByText('$ adb -s RQ8T')).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Saída do comando' })).toBeInTheDocument()
})

test('Enter roda; vazio avisa', async () => {
  const p = props()
  render(<FreeCommandView {...p} />)
  const input = screen.getByRole('textbox', { name: 'Comando livre' })
  await userEvent.type(input, '{Enter}')
  expect(p.flash).toHaveBeenCalledWith('Digite um comando no campo livre.')
  await userEvent.type(input, 'shell getprop{Enter}')
  expect(p.onRunFree).toHaveBeenCalledWith('shell getprop')
})

test('rodando: vira Parar e Enter não roda outro', async () => {
  const user = userEvent.setup()
  const p = props({ run: { ...idle, phase: 'running' } })
  render(<FreeCommandView {...p} />)
  await user.type(screen.getByLabelText('Comando livre'), 'shell ls{Enter}')
  expect(p.onRunFree).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: '■ Parar' }))
  expect(p.onStop).toHaveBeenCalled()
})

test('sem aparelho pronto, Rodar fica desligado', () => {
  render(<FreeCommandView {...props({ device: { serial: 'X', state: 'unauthorized' } })} />)
  expect(screen.getByRole('button', { name: '▶ Rodar' })).toBeDisabled()
})

test('Salvar como comando leva o comando sem o -s', async () => {
  const user = userEvent.setup()
  const p = props()
  render(<FreeCommandView {...p} />)
  await user.click(screen.getByRole('button', { name: 'Salvar como comando' }))
  expect(p.flash).toHaveBeenCalledWith('Digite um comando no campo livre primeiro.')
  await user.type(screen.getByLabelText('Comando livre'), 'adb -s OUTRO shell dumpsys battery')
  await user.click(screen.getByRole('button', { name: 'Salvar como comando' }))
  expect(p.onSaveAsCommand).toHaveBeenCalledWith('adb shell dumpsys battery')
})
