// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Rail } from './Rail'

test('menu mostra Início no topo e marca o ativo', async () => {
  const onSelect = vi.fn()
  render(<Rail active="Fixados" searching={false} onSelect={onSelect} />)
  const items = screen.getAllByRole('button')
  expect(items[0]).toHaveAccessibleName('Início')
  expect(items[0]).toHaveAttribute('aria-current', 'page')
  await userEvent.click(screen.getByRole('button', { name: 'Logs' }))
  expect(onSelect).toHaveBeenCalledWith('Logs')
})
