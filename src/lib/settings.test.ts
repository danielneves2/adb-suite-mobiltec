import { WINDOW_SIZES, fitWindowSizes, initialWindowSize, parseWindowSize } from './settings'

test('tamanhos oferecidos: livre primeiro, depois a compacta e os fixos maiores', () => {
  expect(WINDOW_SIZES.map((s) => s.id)).toEqual(['livre', '1120x630', '1280x720', '1440x900', '1600x900', '1920x1080'])
})

test('parseWindowSize', () => {
  expect(parseWindowSize('livre')).toBeNull()
  expect(parseWindowSize('1440x900')).toEqual({ width: 1440, height: 900 })
  expect(parseWindowSize('lixo')).toBeNull()
  expect(parseWindowSize('100x100')).toBeNull() // menor que o mínimo da janela (900×520)
  expect(parseWindowSize('900x520')).toEqual({ width: 900, height: 520 })
  expect(parseWindowSize('899x520')).toBeNull()
  expect(parseWindowSize('900x519')).toBeNull()
})

test('fitWindowSizes: só os tamanhos que cabem na área útil da tela (com a barra de título)', () => {
  // 1920×1080 a 150% = 1280×720 lógicos, menos a barra de tarefas: a compacta cabe
  expect(fitWindowSizes({ width: 1280, height: 672 })).toEqual(['livre', '1120x630'])
  expect(fitWindowSizes({ width: 1920, height: 1032 })).toEqual(['livre', '1120x630', '1280x720', '1440x900', '1600x900'])
  expect(fitWindowSizes({ width: 2560, height: 1400 })).toEqual(['livre', '1120x630', '1280x720', '1440x900', '1600x900', '1920x1080'])
})

test('initialWindowSize: o tamanho de abertura (1120×630) que cabe na tela fica como está', () => {
  expect(initialWindowSize({ width: 1920, height: 1032 })).toBeNull()
  expect(initialWindowSize({ width: 1280, height: 672 })).toBeNull()
})

test('initialWindowSize: tela menor encolhe até caber, sem passar do mínimo (900×520)', () => {
  // 1366×768 a 125%
  expect(initialWindowSize({ width: 1093, height: 576 })).toEqual({ width: 1093, height: 536 })
  expect(initialWindowSize({ width: 1000, height: 540 })).toEqual({ width: 1000, height: 520 })
  expect(initialWindowSize({ width: 800, height: 500 })).toEqual({ width: 900, height: 520 })
})
