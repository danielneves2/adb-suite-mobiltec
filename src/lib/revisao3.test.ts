// Regressões da 3ª revisão (categorias e formulário).
import rawCatalog from '../../data/catalog.json'
import { filterCommands } from './appLogic'
import type { Catalog, Command } from './catalogTypes'
import { EMPTY_FORM, validateCommandForm } from './commandForm'

const catalog = rawCatalog as unknown as Catalog

test('categoria do menu compara sem diferenciar maiúsculas', () => {
  const meu: Command = { id: 'x', categoria: 'apps', nome: 'X', resumo: '', comando: 'adb shell ls', parametro: null, oficial: false }
  const ids = filterCommands([...catalog.comandos, meu], { search: '', rail: 'Apps', pinned: [] }).map((c) => c.id)
  expect(ids).toContain('x')
  expect(ids).toContain('extrair')
})

test('nomes reservados do menu não viram categoria', () => {
  const f = { ...EMPTY_FORM, nome: 'X', comando: 'adb shell ls' }
  expect(validateCommandForm({ ...f, categoria: 'Fixados' })).toBe('Esse nome é reservado. Escolha outro pra categoria.')
  expect(validateCommandForm({ ...f, categoria: 'meus' })).toBe('Esse nome é reservado. Escolha outro pra categoria.')
  expect(validateCommandForm({ ...f, categoria: 'Início' })).toBe('Esse nome é reservado. Escolha outro pra categoria.')
})
