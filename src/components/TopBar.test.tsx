// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DeviceInfo } from '../lib/appLogic'
import { TopBar } from './TopBar'

const a54: DeviceInfo = { serial: 'R58N12ABCDE', state: 'device', brand: 'Samsung', model: 'Galaxy A54', android: '14' }
const moto: DeviceInfo = { serial: 'ZY1', state: 'device', brand: 'Motorola', model: 'moto g', android: '13' }
const props = { devices: [] as DeviceInfo[], selectedSerial: null as string | null, onSelect: () => {}, onDiagnose: () => {}, onCollect: () => {} }

test('marca e sem aparelho', () => {
  render(<TopBar {...props} />)
  expect(screen.getByRole('img', { name: 'ADB Suite – Mobiltec' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Nenhum aparelho conectado/ })).toBeInTheDocument()
})

test('seletor mostra marca, modelo, Android e serial do aparelho escolhido', () => {
  render(<TopBar {...props} devices={[a54]} selectedSerial="R58N12ABCDE" />)
  const btn = screen.getByRole('button', { name: /Samsung Galaxy A54/ })
  expect(btn).toHaveTextContent('Android 14')
  expect(btn).toHaveTextContent('R58N12ABCDE')
  expect(btn).toHaveAttribute('aria-haspopup', 'listbox')
  expect(btn).toHaveAttribute('aria-expanded', 'false')
})

test('abre a lista, troca de aparelho e fecha', async () => {
  const user = userEvent.setup()
  const onSelect = vi.fn()
  render(<TopBar {...props} devices={[a54, moto]} selectedSerial="R58N12ABCDE" onSelect={onSelect} />)
  await user.click(screen.getByRole('button', { name: /Samsung Galaxy A54/ }))
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  expect(screen.getByRole('option', { name: /Samsung Galaxy A54/ })).toHaveAttribute('aria-selected', 'true')
  await user.click(screen.getByRole('option', { name: /Motorola moto g/ }))
  expect(onSelect).toHaveBeenCalledWith('ZY1')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

test('Esc e clique fora fecham a lista', async () => {
  const user = userEvent.setup()
  render(<TopBar {...props} devices={[a54, moto]} selectedSerial="R58N12ABCDE" />)
  const btn = screen.getByRole('button', { name: /Samsung Galaxy A54/ })
  await user.click(btn)
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  await user.click(btn)
  await user.click(document.body)
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

test('aparelho não autorizado', () => {
  render(<TopBar {...props} devices={[{ serial: 'ZY22', state: 'unauthorized' }]} selectedSerial="ZY22" />)
  expect(screen.getByRole('button', { name: /ZY22/ })).toHaveTextContent('não autorizado — confirme a depuração no aparelho')
})

test('botões do topo chamam as ações', async () => {
  const onDiagnose = vi.fn()
  const onCollect = vi.fn()
  render(<TopBar {...props} onDiagnose={onDiagnose} onCollect={onCollect} />)
  await userEvent.click(screen.getByRole('button', { name: 'Diagnosticar conexão' }))
  await userEvent.click(screen.getByRole('button', { name: 'Coletar diagnóstico' }))
  expect(onDiagnose).toHaveBeenCalled()
  expect(onCollect).toHaveBeenCalled()
})
