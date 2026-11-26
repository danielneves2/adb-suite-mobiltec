// @vitest-environment jsdom
// Atualização automática: aviso na barra de baixo e "Procurar atualização" em Configurações → Sobre.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DeviceInfo } from '../lib/appLogic'
import { Settings, type SettingsProps } from './Settings'
import { StatusBar } from './StatusBar'

const a13: DeviceInfo = { serial: 'RQ8T', state: 'device', brand: 'Samsung', model: 'SM-A135M', android: '14' }
const bar = { pickFolder: async () => null as string | null, deviceDir: null, baseDir: 'C:\\Saidas', onChangeBase: () => {}, onOpen: () => {}, message: null, deviceCount: 1, device: a13, adbOk: true }

const settings = (over: Partial<SettingsProps> = {}): SettingsProps => ({
  windowSize: 'livre',
  onWindowSize: vi.fn(),
  baseDir: 'C:/ADB-Suite/Saidas',
  onChangeBase: vi.fn(),
  onOpenBase: vi.fn(),
  adbVersion: null,
  onClose: vi.fn(),
  pickFolder: vi.fn(async () => null),
  userName: 'Daniel',
  onUserName: vi.fn(),
  ...over,
})

test('barra: versão nova disponível com botão Atualizar agora', async () => {
  const user = userEvent.setup()
  const onInstallUpdate = vi.fn()
  render(<StatusBar {...bar} update={{ kind: 'available', version: '0.3.0', notes: null }} onInstallUpdate={onInstallUpdate} />)
  expect(screen.getByRole('contentinfo')).toHaveTextContent('Versão 0.3.0 disponível')
  await user.click(screen.getByRole('button', { name: 'Atualizar agora' }))
  expect(onInstallUpdate).toHaveBeenCalledTimes(1)
})

test('barra: com comando rodando o botão fica desligado e explica', () => {
  render(<StatusBar {...bar} update={{ kind: 'available', version: '0.3.0', notes: null }} onInstallUpdate={() => {}} updateBlocked />)
  const btn = screen.getByRole('button', { name: 'Atualizar agora' })
  expect(btn).toBeDisabled()
  expect(btn).toHaveAttribute('title', 'Pare o comando antes de atualizar')
})

test('barra: progresso do download, com e sem tamanho conhecido', () => {
  const { rerender } = render(<StatusBar {...bar} update={{ kind: 'downloading', version: '0.3.0', percent: 42 }} />)
  expect(screen.getByRole('contentinfo')).toHaveTextContent('Baixando atualização 42%')
  rerender(<StatusBar {...bar} update={{ kind: 'downloading', version: '0.3.0', percent: null }} />)
  expect(screen.getByRole('contentinfo')).toHaveTextContent('Baixando atualização…')
  expect(screen.getByRole('contentinfo')).not.toHaveTextContent('%')
  rerender(<StatusBar {...bar} update={{ kind: 'restarting' }} />)
  expect(screen.getByRole('contentinfo')).toHaveTextContent('Reiniciando…')
})

test('barra: sem novidade não mostra nada de atualização', () => {
  render(<StatusBar {...bar} update={{ kind: 'error', message: 'x' }} />)
  expect(screen.getByRole('contentinfo')).not.toHaveTextContent(/atualiz/i)
})

test('Sobre: Procurar atualização e o resultado', async () => {
  const user = userEvent.setup()
  const onCheckUpdate = vi.fn()
  const { rerender } = render(<Settings {...settings({ onCheckUpdate, update: { kind: 'idle' } })} />)
  await user.click(screen.getByRole('button', { name: 'Procurar atualização' }))
  expect(onCheckUpdate).toHaveBeenCalledTimes(1)

  rerender(<Settings {...settings({ onCheckUpdate, update: { kind: 'checking' } })} />)
  expect(screen.getByRole('button', { name: 'Procurando…' })).toBeDisabled()

  rerender(<Settings {...settings({ onCheckUpdate, update: { kind: 'none' } })} />)
  expect(screen.getByText('Você já está na versão mais nova.')).toBeInTheDocument()

  rerender(<Settings {...settings({ onCheckUpdate, update: { kind: 'error', message: 'Sem internet.' } })} />)
  expect(screen.getByText('Sem internet.')).toBeInTheDocument()
})

test('Sobre: versão nova dá pra instalar dali mesmo', async () => {
  const user = userEvent.setup()
  const onInstallUpdate = vi.fn()
  render(<Settings {...settings({ update: { kind: 'available', version: '0.3.0', notes: null }, onCheckUpdate: vi.fn(), onInstallUpdate })} />)
  expect(screen.getByText('Versão 0.3.0 disponível.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Atualizar agora' }))
  expect(onInstallUpdate).toHaveBeenCalledTimes(1)
})
