// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Welcome } from './Welcome'

test('pede só o nome; inválido mostra erro; válido entra', async () => {
  const user = userEvent.setup()
  const onEnter = vi.fn()
  render(<Welcome onEnter={onEnter} />)
  expect(screen.getByRole('heading', { name: 'Como você se chama?' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Digite seu nome.')
  expect(onEnter).not.toHaveBeenCalled()
  await user.type(screen.getByRole('textbox', { name: 'Seu nome' }), ' Daniel Lima {Enter}')
  expect(onEnter).toHaveBeenCalledWith('Daniel Lima')
})
