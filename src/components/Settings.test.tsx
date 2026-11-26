// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
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
  pickFolder: vi.fn(async () => null),
  userName: 'Daniel',
  onUserName: vi.fn(),
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

test('usuário: mostra quem está logado e Trocar de usuário sai', async () => {
  const onUserName = vi.fn()
  render(<Settings {...props({ userName: 'Daniel Lima', onUserName })} />)
  expect(screen.getByText('Daniel Lima')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Trocar de usuário' }))
  expect(onUserName).toHaveBeenCalledWith(null)
})

test('tamanho que não cabe na tela fica desligado', () => {
  render(<Settings {...props({ availableSizes: ['livre', '1280x720'] })} />)
  expect(screen.getByRole('radio', { name: /1280 × 720/ })).toBeEnabled()
  expect(screen.getByRole('radio', { name: /1920 × 1080/ })).toBeDisabled()
  expect(screen.getByRole('radio', { name: /1920 × 1080/ }).closest('label')).toHaveTextContent('Maior que esta tela')
})

test('Escolher pasta… abre a janela do Windows e salva a escolhida', async () => {
  const user = userEvent.setup()
  const pickFolder = vi.fn(async () => 'E:/Saidas')
  const p = props({ pickFolder })
  render(<Settings {...p} />)
  await user.click(screen.getByRole('button', { name: 'Escolher pasta…' }))
  expect(pickFolder).toHaveBeenCalledWith('C:/ADB-Suite/Saidas')
  expect(p.onChangeBase).toHaveBeenCalledWith('E:/Saidas')
  expect(screen.getByRole('textbox', { name: 'Pasta de saída' })).toHaveValue('E:/Saidas')
})

test('Sobre mostra a versão real do app', () => {
  render(<Settings {...props({ appVersion: '0.2.0' })} />)
  expect(screen.getByText('0.2.0')).toBeInTheDocument()
})

test('campo da pasta acompanha a pasta atual (outro usuário, ou mudada pela barra de baixo)', () => {
  const { rerender } = render(<Settings {...props({ baseDir: 'D:/Ana' })} />)
  expect(screen.getByRole('textbox', { name: 'Pasta de saída' })).toHaveValue('D:/Ana')
  rerender(<Settings {...props({ baseDir: 'E:/Bruno' })} />)
  expect(screen.getByRole('textbox', { name: 'Pasta de saída' })).toHaveValue('E:/Bruno')
})

describe('Usuários do time', () => {
  test('lista cada técnico com o ícone (iniciais) e o nome; marca quem está usando', () => {
    render(<Settings {...props({ teamUsers: { kind: 'ok', names: ['Ana Lima', 'Bruno', 'Daniel'] } })} />)
    const list = screen.getByRole('list', { name: 'Usuários do time' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['ALAna Lima', 'BBruno', 'DDaniel(você)'])
    expect(screen.getByText('3 técnicos cadastrados')).toBeInTheDocument()
  })

  test('carregando e sem conexão', () => {
    const { rerender } = render(<Settings {...props({ teamUsers: { kind: 'loading' } })} />)
    expect(screen.getByText('Carregando…')).toBeInTheDocument()
    rerender(<Settings {...props({ teamUsers: { kind: 'error' } })} />)
    expect(screen.getByText('Sem conexão: não deu pra carregar a lista.')).toBeInTheDocument()
  })

  test('sem servidor (modo local): a seção não aparece', () => {
    render(<Settings {...props()} />)
    expect(screen.queryByRole('heading', { name: 'Usuários do time' })).not.toBeInTheDocument()
  })
})
