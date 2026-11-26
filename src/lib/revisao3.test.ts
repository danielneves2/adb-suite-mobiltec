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

test('limites iguais aos do servidor: nome até 80, resumo até 500', () => {
  const f = { ...EMPTY_FORM, nome: 'X', comando: 'adb shell ls' }
  expect(validateCommandForm({ ...f, nome: 'n'.repeat(81) })).toBe('Nome do comando com no máximo 80 caracteres.')
  expect(validateCommandForm({ ...f, resumo: 'r'.repeat(501) })).toBe('“Pra que serve” com no máximo 500 caracteres.')
  expect(validateCommandForm({ ...f, nome: 'n'.repeat(80), resumo: 'r'.repeat(500) })).toBeNull()
})

test('nomes reservados do menu não viram categoria', () => {
  const f = { ...EMPTY_FORM, nome: 'X', comando: 'adb shell ls' }
  expect(validateCommandForm({ ...f, categoria: 'Fixados' })).toBe('Esse nome é reservado. Escolha outro pra categoria.')
  expect(validateCommandForm({ ...f, categoria: 'meus' })).toBe('Esse nome é reservado. Escolha outro pra categoria.')
  expect(validateCommandForm({ ...f, categoria: 'Início' })).toBe('Esse nome é reservado. Escolha outro pra categoria.')
})
