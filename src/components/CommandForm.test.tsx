// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DeviceInfo } from '../lib/appLogic'
import { EMPTY_FORM } from '../lib/commandForm'
import { CommandForm } from './CommandForm'

const a54: DeviceInfo = { serial: 'R58N', state: 'device', brand: 'Samsung', model: 'Galaxy A54', android: '14' }

const setup = (over = {}) => {
  const p = { initial: EMPTY_FORM, editing: false, device: a54, deviceDir: 'C:/Saidas/A54', onSave: vi.fn(), onCancel: vi.fn(), ...over }
  render(<CommandForm {...p} />)
  return p
}

test('novo comando: título, aviso de que fica neste computador e prévia vazia', () => {
  setup()
  expect(screen.getByRole('heading', { name: 'Novo comando' })).toBeInTheDocument()
  expect(screen.getByText(/Fica salvo só neste computador/)).toBeInTheDocument()
  expect(screen.getByText('$ adb -s R58N …')).toBeInTheDocument()
})

test('salvar vazio mostra o erro; mexer num campo limpa', async () => {
  const user = userEvent.setup()
  const p = setup()
  await user.click(screen.getByRole('button', { name: 'Salvar comando' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Dá um nome pro comando.')
  expect(p.onSave).not.toHaveBeenCalled()
  await user.type(screen.getByLabelText('Nome do comando'), 'L')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('preenche, vê a prévia com o -s e o exemplo, e salva', async () => {
  const user = userEvent.setup()
  const p = setup()
  await user.type(screen.getByLabelText('Nome do comando'), 'Limpar dados')
  await user.selectOptions(screen.getByLabelText('Categoria'), 'Apps')
  await user.type(screen.getByLabelText('Comando adb'), 'adb shell pm clear {{pacote}')
  await user.selectOptions(screen.getByLabelText('O comando pede'), 'Um pacote de app')
  await user.click(screen.getByLabelText('Pedir confirmação antes de rodar'))
  expect(screen.getByText('$ adb -s R58N shell pm clear br.com.mobiltec.c4m.android.agent')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Salvar comando' }))
  expect(p.onSave).toHaveBeenCalledWith({
    nome: 'Limpar dados',
    categoria: 'Apps',
    resumo: '',
    comando: 'adb shell pm clear {pacote}',
    parametro: 'pkg',
    pede_confirmacao: true,
  })
})

test('editar mostra o título de edição e Cancelar avisa', async () => {
  const p = setup({ editing: true, initial: { ...EMPTY_FORM, nome: 'X', comando: 'adb shell ls' } })
  expect(screen.getByRole('heading', { name: 'Editar comando' })).toBeInTheDocument()
  expect(screen.getByLabelText('Nome do comando')).toHaveValue('X')
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(p.onCancel).toHaveBeenCalled()
})
