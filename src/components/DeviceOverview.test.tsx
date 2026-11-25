// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DeviceInfo } from '../lib/appLogic'
import type { ActivityEntry } from '../lib/overview'
import { DeviceOverview, type DeviceOverviewProps } from './DeviceOverview'

const a13: DeviceInfo = { serial: 'RQ8T502DZEH', state: 'device', brand: 'Samsung', model: 'SM-A135M', android: '14' }
const at = new Date(2026, 10, 25, 14, 28, 11)

const props = (over: Partial<DeviceOverviewProps> = {}): DeviceOverviewProps => ({
  device: a13,
  entries: [],
  onDiagnose: vi.fn(),
  onCollect: vi.fn(),
  onInfo: vi.fn(),
  onOpenFolder: vi.fn(),
  flash: vi.fn(),
  ...over,
})

test('com aparelho: nome, serial, blocos e status conectado', () => {
  render(<DeviceOverview {...props()} />)
  expect(screen.getByRole('heading', { name: 'Samsung SM-A135M' })).toBeInTheDocument()
  expect(screen.getByText('Conectado (ADB)')).toBeInTheDocument()
  const blocos = screen.getByRole('list', { name: 'Dados do aparelho' })
  expect(blocos).toHaveTextContent('Sistema operacionalAndroid 14')
  expect(blocos).toHaveTextContent('Número de sérieRQ8T502DZEH')
  expect(blocos).toHaveTextContent('Status ADBConectado')
  expect(blocos).toHaveTextContent('TransporteUSB')
})

test('não autorizado não aparece como conectado', () => {
  render(<DeviceOverview {...props({ device: { serial: 'ZY22', state: 'unauthorized' } })} />)
  expect(screen.getByText('Não autorizado')).toBeInTheDocument()
  expect(screen.queryByText('Conectado (ADB)')).not.toBeInTheDocument()
  expect(screen.getByText(/confirme a depuração USB/i)).toBeInTheDocument()
})

test('sem aparelho mostra o passo a passo', () => {
  render(<DeviceOverview {...props({ device: null })} />)
  expect(screen.getByText('Sem aparelho')).toBeInTheDocument()
  expect(screen.getByText(/Depuração USB/)).toBeInTheDocument()
})

test('ações rápidas e copiar serial', async () => {
  const user = userEvent.setup()
  const p = props()
  render(<DeviceOverview {...p} />)
  await user.click(screen.getByRole('button', { name: 'Diagnosticar conexão' }))
  await user.click(screen.getByRole('button', { name: 'Coletar diagnóstico' }))
  await user.click(screen.getByRole('button', { name: 'Informações do aparelho' }))
  await user.click(screen.getByRole('button', { name: 'Arquivos coletados' }))
  expect(p.onDiagnose).toHaveBeenCalled()
  expect(p.onCollect).toHaveBeenCalled()
  expect(p.onInfo).toHaveBeenCalled()
  expect(p.onOpenFolder).toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Copiar serial' }))
  expect(await navigator.clipboard.readText()).toBe('RQ8T502DZEH')
})

test('última atividade: até 8 entradas, ou aviso de vazio', () => {
  const entries: ActivityEntry[] = Array.from({ length: 12 }, (_, i) => ({ at, tag: 'CMD', text: `cmd ${i}` }))
  const { unmount } = render(<DeviceOverview {...props({ entries })} />)
  const itens = screen.getAllByRole('listitem').filter((li) => li.closest('[aria-label="Última atividade"]'))
  expect(itens).toHaveLength(8)
  expect(itens[0]).toHaveTextContent('[14:28:11][CMD]cmd 0')
  unmount()
  render(<DeviceOverview {...props()} />)
  expect(screen.getByText('Nada ainda nesta sessão.')).toBeInTheDocument()
})
