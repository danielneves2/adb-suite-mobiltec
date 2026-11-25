import { WINDOW_SIZES, parseWindowSize } from './settings'

test('tamanhos oferecidos: livre primeiro, depois fixos', () => {
  expect(WINDOW_SIZES.map((s) => s.id)).toEqual(['livre', '1280x720', '1440x900', '1600x900', '1920x1080'])
})

test('parseWindowSize', () => {
  expect(parseWindowSize('livre')).toBeNull()
  expect(parseWindowSize('1440x900')).toEqual({ width: 1440, height: 900 })
  expect(parseWindowSize('lixo')).toBeNull()
  expect(parseWindowSize('100x100')).toBeNull() // menor que o mínimo da janela (960×600)
})
