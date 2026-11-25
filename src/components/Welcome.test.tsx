// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Welcome } from './Welcome'

test('pede só o nome; inválido mostra erro; válido entra', async () => {
  const user = userEvent.setup()
  const onEnter = vi.fn()
  render(<Welcome onEnter={onEnter} />)
  expect(screen.getByRole('heading', { name: 'Como você quer ser chamado?' })).toBeInTheDocument()
  expect(screen.getByText('Dados salvos somente neste dispositivo')).toBeInTheDocument()
  expect(screen.getByText('sem senha · sem e-mail')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Digite seu nome.')
  expect(onEnter).not.toHaveBeenCalled()
  await user.type(screen.getByRole('textbox', { name: 'Seu nome' }), ' Daniel Lima {Enter}')
  expect(onEnter).toHaveBeenCalledWith('Daniel Lima')
})

test('perfis salvos aparecem para entrar com um clique, e dá pra esquecer', async () => {
  const user = userEvent.setup()
  const onEnter = vi.fn()
  const onForget = vi.fn()
  render(<Welcome onEnter={onEnter} knownUsers={['Daniel Lima', 'Ana']} onForget={onForget} />)
  await user.click(screen.getByRole('button', { name: 'Entrar como Daniel Lima' }))
  expect(onEnter).toHaveBeenCalledWith('Daniel Lima')
  await user.click(screen.getByRole('button', { name: 'Esquecer Ana' }))
  expect(onForget).toHaveBeenCalledWith('Ana')
})
