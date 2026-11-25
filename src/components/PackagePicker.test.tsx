// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PackageKind } from '../lib/adb'
import { PackagePicker } from './PackagePicker'

const data: Record<PackageKind, string[]> = {
  user: ['br.com.mobiltec.c4m.android.agent', 'com.whatsapp'],
  system: ['com.android.chrome', 'com.android.settings', 'com.samsung.android.dialer'],
  all: ['br.com.mobiltec.c4m.android.agent', 'com.android.chrome', 'com.android.settings', 'com.samsung.android.dialer', 'com.whatsapp'],
}

const setup = (over = {}) => {
  const load = vi.fn(async (kind: PackageKind) => data[kind])
  const p = { serial: 'RQ8T', deviceName: 'Samsung SM-A135M', selected: '', load, onPick: vi.fn(), onClose: vi.fn(), ...over }
  render(<PackagePicker {...p} />)
  return p
}

test('abre nos apps do usuário do aparelho, com contagem', async () => {
  const p = setup()
  expect(screen.getByRole('heading', { name: /Apps do Samsung SM-A135M/ })).toBeInTheDocument()
  expect(await screen.findByRole('option', { name: 'com.whatsapp' })).toBeInTheDocument()
  expect(p.load).toHaveBeenCalledWith('user')
  expect(screen.getByText('2 apps')).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: 'Do usuário' })).toBeChecked()
})

test('troca para sistema, busca e escolhe', async () => {
  const user = userEvent.setup()
  const p = setup()
  await screen.findByRole('option', { name: 'com.whatsapp' })
  await user.click(screen.getByRole('radio', { name: 'Do sistema' }))
  expect(await screen.findByRole('option', { name: 'com.android.chrome' })).toBeInTheDocument()
  await user.type(screen.getByRole('searchbox', { name: 'Filtrar apps' }), 'sett')
  expect(screen.getAllByRole('option')).toHaveLength(1)
  expect(screen.getByText('1 de 3 apps')).toBeInTheDocument()
  await user.click(screen.getByRole('option', { name: 'com.android.settings' }))
  expect(p.onPick).toHaveBeenCalledWith('com.android.settings')
})

test('lista de cada tipo é carregada uma vez só', async () => {
  const user = userEvent.setup()
  const p = setup()
  await screen.findByRole('option', { name: 'com.whatsapp' })
  await user.click(screen.getByRole('radio', { name: 'Todos' }))
  await screen.findByRole('option', { name: 'com.android.chrome' })
  await user.click(screen.getByRole('radio', { name: 'Do usuário' }))
  await screen.findByRole('option', { name: 'com.whatsapp' })
  expect(p.load).toHaveBeenCalledTimes(2)
})

test('marca o app que já está no campo; erro aparece; Fechar avisa', async () => {
  const user = userEvent.setup()
  const load = vi.fn(async () => {
    throw new Error("error: device 'RQ8T' not found")
  })
  const p = setup({ load })
  expect(await screen.findByRole('alert')).toHaveTextContent("device 'RQ8T' not found")
  await user.click(screen.getByRole('button', { name: 'Fechar' }))
  expect(p.onClose).toHaveBeenCalled()
})

test('o pacote do campo aparece selecionado', async () => {
  setup({ selected: 'com.whatsapp' })
  const opt = await screen.findByRole('option', { name: 'com.whatsapp' })
  await waitFor(() => expect(opt).toHaveAttribute('aria-selected', 'true'))
})
