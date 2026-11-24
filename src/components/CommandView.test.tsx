// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import rawCatalog from '../../data/catalog.json'
import type { DeviceInfo } from '../lib/appLogic'
import type { Catalog, Command } from '../lib/catalogTypes'
import type { RunView } from '../state/useRunner'
import { CommandView, type CommandViewProps } from './CommandView'

const catalog = rawCatalog as unknown as Catalog
const byId = (id: string) => catalog.comandos.find((c) => c.id === id) as Command
const a54: DeviceInfo = { serial: 'R58N12ABCDE', state: 'device', brand: 'Samsung', model: 'Galaxy A54', android: '14' }
const idle: RunView = { phase: 'idle', display: null, lines: [], result: null, error: null, extra: '' }

function props(over: Partial<CommandViewProps> = {}): CommandViewProps {
  return {
    command: byId('foco'),
    device: a54,
    deviceDir: 'C:\\Saidas\\Samsung-Galaxy-A54_R58N12ABCDE',
    packages: [],
    suggestedPackages: ['br.com.mobiltec.c4m.android.agent'],
    pinned: false,
    onTogglePin: vi.fn(),
    run: idle,
    onRun: vi.fn(),
    onRunFree: vi.fn(),
    onStop: vi.fn(),
    onReset: vi.fn(),
    onOpenFolder: vi.fn(),
    onSaveOutput: vi.fn(),
    onRestartServer: vi.fn(),
    flash: vi.fn(),
    ...over,
  }
}

test('botão Executar com o modelo e Ver comando com $', () => {
  render(<CommandView {...props()} />)
  expect(screen.getByRole('button', { name: '▶ Executar no Galaxy A54' })).toBeEnabled()
  expect(screen.getByText(/\$ adb -s R58N12ABCDE shell/)).toBeInTheDocument()
})

test('sem aparelho: Executar desabilitado com aviso', () => {
  render(<CommandView {...props({ device: null })} />)
  expect(screen.getByRole('button', { name: /Executar/ })).toBeDisabled()
  expect(screen.getByText('Conecte um aparelho')).toBeInTheDocument()
})

test('escolha mostra cartões com a pergunta e o cartão Outro… abre o campo', async () => {
  const onRun = vi.fn()
  render(<CommandView {...props({ command: byId('listar'), onRun })} />)
  expect(screen.getByRole('group', { name: 'Quais pacotes?' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Do usuário/ })).toHaveAttribute('aria-pressed', 'true')
  await userEvent.click(screen.getByRole('button', { name: /Outro…/ }))
  const field = screen.getByRole('textbox', { name: 'Filtro' })
  await userEvent.type(field, '-e')
  await userEvent.click(screen.getByRole('button', { name: /Executar/ }))
  expect(onRun).toHaveBeenCalledWith('-e', false)
})

test('atalho com valor vazio (Reiniciar → Normal) roda com allowEmpty', async () => {
  const onRun = vi.fn()
  render(<CommandView {...props({ command: byId('reiniciar'), onRun })} />)
  await userEvent.click(screen.getByRole('button', { name: /Normal/ }))
  await userEvent.click(screen.getByRole('button', { name: /Executar/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Sim, executar' }))
  expect(onRun).toHaveBeenCalledWith('', true)
})

test('sem escolha, atalhos viram chips que preenchem o campo', async () => {
  render(<CommandView {...props({ command: byId('buscar') })} />)
  expect(screen.getByText('Atalhos:')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'datamob' }))
  expect(screen.getByRole('textbox', { name: 'Parte do nome do pacote' })).toHaveValue('datamob')
})

test('pede_confirmacao mostra a faixa ATENÇÃO com o texto exato', async () => {
  const onRun = vi.fn()
  render(<CommandView {...props({ command: byId('desinstalar'), onRun })} />)
  await userEvent.click(screen.getByRole('button', { name: /Executar/ }))
  const strip = screen.getByRole('alertdialog')
  expect(strip).toHaveTextContent('ATENÇÃO')
  expect(strip).toHaveTextContent(
    'Você vai desinstalar br.com.mobiltec.c4m.android.agent no Samsung Galaxy A54 (R58N12ABCDE). Isso pode não ter volta.',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(onRun).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: /Executar/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Sim, executar' }))
  expect(onRun).toHaveBeenCalledWith('br.com.mobiltec.c4m.android.agent', false)
})

test('executando vira ■ Parar', async () => {
  const onStop = vi.fn()
  render(<CommandView {...props({ run: { ...idle, phase: 'running' }, onStop })} />)
  await userEvent.click(screen.getByRole('button', { name: '■ Parar' }))
  expect(onStop).toHaveBeenCalled()
})

test('Copiar comando vira Copiado ✓', async () => {
  const user = userEvent.setup()
  render(<CommandView {...props()} />)
  await user.click(screen.getByRole('button', { name: 'Copiar comando' }))
  expect(screen.getByRole('button', { name: 'Copiado ✓' })).toBeInTheDocument()
  expect(await navigator.clipboard.readText()).toContain('adb -s R58N12ABCDE shell')
})

test('comando livre: Enter roda; vazio avisa', async () => {
  const onRunFree = vi.fn()
  const flash = vi.fn()
  render(<CommandView {...props({ onRunFree, flash })} />)
  const input = screen.getByRole('textbox', { name: 'Comando livre' })
  await userEvent.type(input, '{Enter}')
  expect(flash).toHaveBeenCalledWith('Digite um comando no campo livre.')
  await userEvent.type(input, 'shell getprop{Enter}')
  expect(onRunFree).toHaveBeenCalledWith('shell getprop')
})

test('Fixar alterna', async () => {
  const onTogglePin = vi.fn()
  render(<CommandView {...props({ onTogglePin })} />)
  await userEvent.click(screen.getByRole('button', { name: /Fixar/ }))
  expect(onTogglePin).toHaveBeenCalled()
})
