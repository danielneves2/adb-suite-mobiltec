import { initials, validateUserName } from './user'

test('nome: obrigatório, 2 a 40 letras, sem símbolos estranhos', () => {
  expect(validateUserName('  ')).toBe('Digite seu nome.')
  expect(validateUserName('D')).toBe('Use pelo menos 2 letras.')
  expect(validateUserName('x'.repeat(41))).toBe('Use no máximo 40 caracteres.')
  expect(validateUserName('Daniel <script>')).toBe('Use só letras, espaços, ponto, hífen e apóstrofo.')
  expect(validateUserName(' Daniel Lima ')).toBeNull()
  expect(validateUserName("João D'Ávila-Souza Jr.")).toBeNull()
})

test('iniciais: primeira e última palavra', () => {
  expect(initials('Daniel Lima')).toBe('DL')
  expect(initials('  daniel  ')).toBe('D')
  expect(initials('João da Silva')).toBe('JS')
})
