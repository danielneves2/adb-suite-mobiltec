import { progressPercent } from './updater'

test('progresso em % inteiro', () => {
  expect(progressPercent(50, 100)).toBe(50)
  expect(progressPercent(1, 3)).toBe(33)
})

test('sem tamanho total não inventa %', () => {
  expect(progressPercent(500, null)).toBeNull()
  expect(progressPercent(500, 0)).toBeNull()
})

test('nunca passa de 100', () => {
  expect(progressPercent(120, 100)).toBe(100)
})
