// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DeviceInfo } from '../lib/appLogic'
import type { RunView } from '../state/useRunner'
import { OutputPanel, type OutputPanelProps } from './OutputPanel'

const a54: DeviceInfo = { serial: 'R58N', state: 'device', brand: 'Samsung', model: 'Galaxy A54', android: '14' }
const at = new Date(2026, 10, 24, 14, 32)
const idle: RunView = { phase: 'idle', display: null, lines: [], result: null, error: null, extra: '' }
const done: RunView = {
  phase: 'done',
  display: 'adb -s R58N shell wm size',
  lines: [],
  result: { output: 'Physical size: 1080x2340\n', exitCode: 0, durationMs: 600, display: 'adb -s R58N shell wm size', at },
  error: null,
  extra: '',
}

const props = (over: Partial<OutputPanelProps> = {}): OutputPanelProps => ({
  run: idle,
  device: a54,
  generatesFile: false,
  onOpenFolder: vi.fn(),
  onSave: vi.fn(),
  onRestartServer: vi.fn(),
  ...over,
})

test('estados do status', () => {
  const { rerender } = render(<OutputPanel {...props()} />)
  expect(screen.getByText('aguardando')).toBeInTheDocument()
  expect(screen.getByText(/pronto\. execute o comando pra ver a saída aqui\./)).toBeInTheDocument()
  rerender(<OutputPanel {...props({ run: { ...idle, phase: 'running' } })} />)
  expect(screen.getByText('executando…')).toBeInTheDocument()
  rerender(<OutputPanel {...props({ run: done })} />)
  expect(screen.getByText('concluído em 0,6 s')).toBeInTheDocument()
  expect(screen.getByText('# Samsung Galaxy A54 · Android 14 · serial R58N · 24/11/2026 14:32')).toBeInTheDocument()
  rerender(<OutputPanel {...props({ run: { ...done, result: { ...done.result!, exitCode: 3 } } })} />)
  expect(screen.getByText('erro (código 3) em 0,6 s')).toBeInTheDocument()
})

test('Abrir pasta só com gera_arquivo e depois de executar', () => {
  const { rerender } = render(<OutputPanel {...props({ generatesFile: true })} />)
  expect(screen.queryByRole('button', { name: 'Abrir pasta' })).not.toBeInTheDocument()
  rerender(<OutputPanel {...props({ generatesFile: true, run: done })} />)
  expect(screen.getByRole('button', { name: 'Abrir pasta' })).toBeInTheDocument()
})

test('Copiar pro chamado copia o template', async () => {
  const user = userEvent.setup()
  render(<OutputPanel {...props({ run: done })} />)
  await user.click(screen.getByRole('button', { name: 'Copiar pro chamado' }))
  expect(await navigator.clipboard.readText()).toBe(
    'Aparelho: Samsung Galaxy A54 (Android 14)\nSerial: R58N\nData: 24/11/2026 14:32\nComando: adb -s R58N shell wm size\n----------------------------------------\nPhysical size: 1080x2340\n',
  )
  expect(screen.getByRole('button', { name: 'Copiado ✓' })).toBeInTheDocument()
})

test('conflito de servidor adb oferece reiniciar', async () => {
  const onRestartServer = vi.fn()
  render(<OutputPanel {...props({ onRestartServer, run: { ...idle, phase: 'error', error: 'adb server version (40) doesn\'t match this client (41)' } })} />)
  await userEvent.click(screen.getByRole('button', { name: 'Reiniciar servidor adb' }))
  expect(onRestartServer).toHaveBeenCalled()
})

test('conflito de servidor na saída de Diagnosticar conexão oferece reiniciar', () => {
  const run: RunView = {
    ...idle,
    phase: 'done',
    display: 'adb devices -l',
    result: { output: "adb server version (40) doesn't match this client (41); killing...\n", exitCode: 0, durationMs: 10, display: 'adb devices -l', at: new Date() },
  }
  render(<OutputPanel {...props({ run })} />)
  expect(screen.getByRole('button', { name: 'Reiniciar servidor adb' })).toBeInTheDocument()
})
