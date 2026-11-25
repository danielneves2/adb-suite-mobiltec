// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Rail } from './Rail'

test('menu mostra Início no topo e marca o ativo', async () => {
  const onSelect = vi.fn()
  render(<Rail active="Fixados" searching={false} onSelect={onSelect} onSettings={() => {}} settingsActive={false} onFree={() => {}} freeActive={false} userName={null} onProfile={() => {}} />)
  const items = screen.getAllByRole('button')
  expect(items[0]).toHaveAccessibleName('Início')
  expect(items[0]).toHaveAttribute('aria-current', 'page')
  await userEvent.click(screen.getByRole('button', { name: 'Logs' }))
  expect(onSelect).toHaveBeenCalledWith('Logs')
})

test('Configurações fica no fim do menu', async () => {
  const onSettings = vi.fn()
  render(<Rail active="Fixados" searching={false} onSelect={() => {}} onSettings={onSettings} settingsActive onFree={() => {}} freeActive={false} userName={null} onProfile={() => {}} />)
  const items = screen.getAllByRole('button')
  const last = items[items.length - 1]
  expect(last).toHaveAccessibleName('Configurações')
  expect(last).toHaveAttribute('aria-current', 'page')
  expect(items[0]).not.toHaveAttribute('aria-current')
  await userEvent.click(last)
  expect(onSettings).toHaveBeenCalled()
})

test('Comando livre tem item próprio logo depois de Início', async () => {
  const onFree = vi.fn()
  render(<Rail active="Fixados" searching={false} onSelect={() => {}} onSettings={() => {}} settingsActive={false} onFree={onFree} freeActive userName={null} onProfile={() => {}} />)
  const items = screen.getAllByRole('button')
  expect(items[1]).toHaveAccessibleName('Comando livre')
  expect(items[1]).toHaveAttribute('aria-current', 'page')
  expect(items[0]).not.toHaveAttribute('aria-current')
  await userEvent.click(items[1])
  expect(onFree).toHaveBeenCalled()
})

test('cartão do usuário no fim do menu abre o perfil', async () => {
  const onProfile = vi.fn()
  render(<Rail active="Fixados" searching={false} onSelect={() => {}} onSettings={() => {}} settingsActive={false} onFree={() => {}} freeActive={false} userName="Daniel Lima" onProfile={onProfile} />)
  const card = screen.getByRole('button', { name: /Daniel Lima/ })
  expect(card).toHaveTextContent('DL')
  await userEvent.click(card)
  expect(onProfile).toHaveBeenCalled()
})
