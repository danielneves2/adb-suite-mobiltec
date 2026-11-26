// @vitest-environment jsdom
// Sincronização com o time: status na barra, erro ao salvar sem conexão, selo do autor.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DeviceInfo } from '../lib/appLogic'
import type { Command } from '../lib/catalogTypes'
import { EMPTY_FORM } from '../lib/commandForm'
import type { RunView } from '../state/useRunner'
import { CommandForm } from './CommandForm'
import { CommandView, type CommandViewProps } from './CommandView'
import { StatusBar } from './StatusBar'

const a54: DeviceInfo = { serial: 'R58N', state: 'device', brand: 'Samsung', model: 'Galaxy A54', android: '14' }
const bar = { pickFolder: async () => null as string | null, deviceDir: null, baseDir: 'C:\\Saidas', onChangeBase: () => {}, onOpen: () => {}, message: null, deviceCount: 1, device: a54, adbOk: true }

test('barra: status da sincronização', () => {
  const { rerender } = render(<StatusBar {...bar} syncStatus="online" />)
  expect(screen.getByRole('contentinfo')).toHaveTextContent('Sincronizado')
  rerender(<StatusBar {...bar} syncStatus="offline" />)
  expect(screen.getByRole('contentinfo')).toHaveTextContent('Sem conexão')
  rerender(<StatusBar {...bar} syncStatus="syncing" />)
  expect(screen.getByRole('contentinfo')).toHaveTextContent('Sincronizando…')
  rerender(<StatusBar {...bar} syncStatus="local" />)
  expect(screen.getByRole('contentinfo')).not.toHaveTextContent(/Sincroniz|Sem conexão/)
})

test('formulário: sem conexão mostra o erro e mantém o que foi digitado', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn(async () => {
    throw new Error('Sem conexão com o servidor.')
  })
  render(<CommandForm initial={{ ...EMPTY_FORM, nome: 'Wi-Fi', comando: 'adb shell ls' }} editing={false} device={a54} deviceDir={null} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Salvar comando' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão com o servidor. O comando não foi salvo; o catálogo continua funcionando.')
  expect(screen.getByLabelText('Nome do comando')).toHaveValue('Wi-Fi')
})

test('formulário: enquanto salva, o botão fica desligado', async () => {
  const user = userEvent.setup()
  const onSave = vi.fn(() => new Promise<void>(() => {}))
  render(<CommandForm initial={{ ...EMPTY_FORM, nome: 'Wi-Fi', comando: 'adb shell ls' }} editing={false} device={a54} deviceDir={null} onSave={onSave} onCancel={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Salvar comando' }))
  expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
})

test('formulário: com o time, o aviso diz que vai pro time', () => {
  render(<CommandForm initial={EMPTY_FORM} editing={false} device={a54} deviceDir={null} onSave={vi.fn()} onCancel={vi.fn()} shared />)
  expect(screen.getByText('Vai pro time todo assim que você salvar.')).toBeInTheDocument()
})

const IDLE: RunView = { runId: null, phase: 'idle', display: null, lines: [], result: null, error: null, extra: '' }
const meu: Command = { id: 'local-1', categoria: 'Rede', nome: 'Wi-Fi', resumo: '', comando: 'adb shell ls', parametro: null, oficial: false, autor: 'Ana' }
const view = (over: Partial<CommandViewProps> = {}): CommandViewProps => ({
  command: meu,
  device: a54,
  deviceDir: null,
  packages: [],
  suggestedPackages: [],
  pinned: false,
  onTogglePin: vi.fn(),
  run: IDLE,
  onRun: vi.fn(),
  onStop: vi.fn(),
  onReset: vi.fn(),
  onOpenFolder: vi.fn(),
  onSaveOutput: vi.fn(),
  onRestartServer: vi.fn(),
  flash: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  loadPackages: vi.fn(async () => []),
  pickFile: vi.fn(async () => null),
  ...over,
})

test('selo: com o time mostra só o autor; sem servidor avisa que é deste PC', () => {
  const { rerender } = render(<CommandView {...view({ shared: true })} />)
  expect(screen.getByText('POR ANA')).toBeInTheDocument()
  rerender(<CommandView {...view({ shared: false })} />)
  expect(screen.getByText('POR ANA · SÓ NESTE PC')).toBeInTheDocument()
})
