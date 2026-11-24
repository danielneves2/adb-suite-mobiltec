// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DeviceInfo } from '../lib/appLogic'
import { TopBar } from './TopBar'

const a54: DeviceInfo = { serial: 'R58N12ABCDE', state: 'device', brand: 'Samsung', model: 'Galaxy A54', android: '14' }
const props = { devices: [] as DeviceInfo[], selectedSerial: null as string | null, onSelect: () => {}, onDiagnose: () => {}, onCollect: () => {} }

test('sem aparelho', () => {
  render(<TopBar {...props} />)
  expect(screen.getByText('Nenhum aparelho conectado')).toBeInTheDocument()
})

test('aparelho pronto mostra marca, modelo, Android e serial', () => {
  render(<TopBar {...props} devices={[a54]} selectedSerial="R58N12ABCDE" />)
  const btn = screen.getByRole('button', { name: /Samsung Galaxy A54/ })
  expect(btn).toHaveTextContent('Android 14')
  expect(btn).toHaveTextContent('R58N12ABCDE')
  expect(btn).toHaveAttribute('aria-pressed', 'true')
})

test('aparelho não autorizado', () => {
  render(<TopBar {...props} devices={[{ serial: 'ZY22', state: 'unauthorized' }]} />)
  expect(screen.getByText('ZY22 · não autorizado — confirme a depuração no aparelho')).toBeInTheDocument()
})

test('clicar troca o aparelho; botões do topo chamam as ações', async () => {
  const onSelect = vi.fn()
  const onDiagnose = vi.fn()
  const onCollect = vi.fn()
  const moto: DeviceInfo = { serial: 'ZY1', state: 'device', brand: 'Motorola', model: 'moto g', android: '13' }
  render(<TopBar {...props} devices={[a54, moto]} selectedSerial="R58N12ABCDE" onSelect={onSelect} onDiagnose={onDiagnose} onCollect={onCollect} />)
  await userEvent.click(screen.getByRole('button', { name: /Motorola moto g/ }))
  expect(onSelect).toHaveBeenCalledWith('ZY1')
  await userEvent.click(screen.getByRole('button', { name: 'Diagnosticar conexão' }))
  await userEvent.click(screen.getByRole('button', { name: 'Coletar diagnóstico' }))
  expect(onDiagnose).toHaveBeenCalled()
  expect(onCollect).toHaveBeenCalled()
})
