import { WINDOW_SIZES, fitWindowSizes, parseWindowSize } from './settings'

test('tamanhos oferecidos: livre primeiro, depois fixos', () => {
  expect(WINDOW_SIZES.map((s) => s.id)).toEqual(['livre', '1280x720', '1440x900', '1600x900', '1920x1080'])
})

test('parseWindowSize', () => {
  expect(parseWindowSize('livre')).toBeNull()
  expect(parseWindowSize('1440x900')).toEqual({ width: 1440, height: 900 })
  expect(parseWindowSize('lixo')).toBeNull()
  expect(parseWindowSize('100x100')).toBeNull() // menor que o mínimo da janela (960×600)
})

test('fitWindowSizes: só os tamanhos que cabem na área útil da tela (com a barra de título)', () => {
  // 1920×1080 a 150% = 1280×720 lógicos, menos a barra de tarefas
  expect(fitWindowSizes({ width: 1280, height: 672 })).toEqual(['livre'])
  expect(fitWindowSizes({ width: 1920, height: 1032 })).toEqual(['livre', '1280x720', '1440x900', '1600x900'])
  expect(fitWindowSizes({ width: 2560, height: 1400 })).toEqual(['livre', '1280x720', '1440x900', '1600x900', '1920x1080'])
})
