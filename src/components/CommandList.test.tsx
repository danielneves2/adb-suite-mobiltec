// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import rawCatalog from '../../data/catalog.json'
import type { Catalog, Command } from '../lib/catalogTypes'
import { CommandList } from './CommandList'

const catalog = rawCatalog as unknown as Catalog
const byId = (id: string) => catalog.comandos.find((c) => c.id === id) as Command

const base = {
  title: 'Apps',
  commands: [byId('extrair'), byId('desinstalar')],
  selectedId: null as string | null,
  showCategory: false,
  emptyText: 'Nenhum comando seu ainda. Use “+ Novo comando”.',
  search: '',
  onSearch: () => {},
  onSelect: () => {},
  onNew: () => {},
}

test('título, contagem e [!] em comando com confirmação', () => {
  render(<CommandList {...base} />)
  expect(screen.getByRole('heading', { name: 'Apps' })).toBeInTheDocument()
  expect(screen.getByText('2')).toBeInTheDocument()
  const item = screen.getByRole('button', { name: /Remover app/ })
  expect(item).toHaveTextContent('[!]')
  expect(screen.getByRole('button', { name: /Extrair APK/ })).not.toHaveTextContent('[!]')
})

test('resultados de busca mostram a categoria', () => {
  render(<CommandList {...base} title="Resultados" showCategory search="apk" />)
  expect(screen.getByRole('button', { name: /Extrair APK/ })).toHaveTextContent('Apps')
})

test('selecionado ganha "> " e resumo vai no title', () => {
  render(<CommandList {...base} selectedId="extrair" />)
  const item = screen.getByRole('button', { name: /Extrair APK/ })
  expect(item).toHaveTextContent('> Extrair APK')
  expect(item).toHaveAttribute('title', byId('extrair').resumo)
})

test('lista vazia mostra o texto', () => {
  render(<CommandList {...base} commands={[]} title="Resultados" emptyText="Nenhum comando encontrado." />)
  expect(screen.getByText('Nenhum comando encontrado.')).toBeInTheDocument()
})

test('digitar na busca chama onSearch e clicar chama onSelect', async () => {
  const onSearch = vi.fn()
  const onSelect = vi.fn()
  render(<CommandList {...base} onSearch={onSearch} onSelect={onSelect} />)
  await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar em todos os comandos' }), 'a')
  expect(onSearch).toHaveBeenCalledWith('a')
  await userEvent.click(screen.getByRole('button', { name: /Extrair APK/ }))
  expect(onSelect).toHaveBeenCalledWith('extrair')
})

test('“+ Novo comando” fica sempre no rodapé da lista, mesmo vazia', async () => {
  const onNew = vi.fn()
  render(<CommandList {...base} commands={[]} onNew={onNew} />)
  await userEvent.click(screen.getByRole('button', { name: '+ Novo comando' }))
  expect(onNew).toHaveBeenCalled()
})
