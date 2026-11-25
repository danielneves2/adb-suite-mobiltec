// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings, type SettingsProps } from './Settings'

const props = (over: Partial<SettingsProps> = {}): SettingsProps => ({
  windowSize: 'livre',
  onWindowSize: vi.fn(),
  baseDir: 'C:/ADB-Suite/Saidas',
  onChangeBase: vi.fn(),
  onOpenBase: vi.fn(),
  adbVersion: 'Android Debug Bridge version 1.0.41',
  onClose: vi.fn(),
  ...over,
})

test('mostra o tamanho atual e troca para um fixo', async () => {
  const p = props()
  render(<Settings {...p} />)
  expect(screen.getByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: /Livre/ })).toBeChecked()
  await userEvent.click(screen.getByRole('radio', { name: /1440 × 900/ }))
  expect(p.onWindowSize).toHaveBeenCalledWith('1440x900')
})

test('pasta de saída: salvar e abrir', async () => {
  const user = userEvent.setup()
  const p = props()
  render(<Settings {...p} />)
  const input = screen.getByRole('textbox', { name: 'Pasta de saída' })
  await user.clear(input)
  await user.type(input, 'D:/Logs')
  await user.click(screen.getByRole('button', { name: 'Salvar pasta' }))
  expect(p.onChangeBase).toHaveBeenCalledWith('D:/Logs')
  await user.click(screen.getByRole('button', { name: 'Abrir pasta' }))
  expect(p.onOpenBase).toHaveBeenCalled()
})

test('sobre mostra a versão do adb; fechar avisa', async () => {
  const p = props()
  render(<Settings {...p} />)
  expect(screen.getByText('Android Debug Bridge version 1.0.41')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
  expect(p.onClose).toHaveBeenCalled()
})
