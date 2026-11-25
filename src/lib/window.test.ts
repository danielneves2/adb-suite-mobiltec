import { createWindowSizer, type WindowApi } from './window'

function fakeWindow() {
  const state = { resizable: true, maximizable: true, size: { width: 1280, height: 800 } }
  const calls: string[] = []
  const step = (name: string, fn: () => void) => async () => {
    await new Promise((r) => setTimeout(r, 5))
    calls.push(name)
    fn()
  }
  const api: WindowApi = {
    unmaximize: step('unmaximize', () => {}),
    setResizable: (v) => step(`resizable:${v}`, () => (state.resizable = v))(),
    setMaximizable: (v) => step(`maximizable:${v}`, () => (state.maximizable = v))(),
    setSize: (w, h) => step(`size:${w}x${h}`, () => (state.size = { width: w, height: h }))(),
    center: step('center', () => {}),
  }
  return { api, state, calls }
}

test('fixo trava; livre destrava', async () => {
  const w = fakeWindow()
  const apply = createWindowSizer(w.api)
  await apply('1440x900')
  expect(w.state).toEqual({ resizable: false, maximizable: false, size: { width: 1440, height: 900 } })
  await apply('livre')
  expect(w.state.resizable).toBe(true)
  expect(w.state.maximizable).toBe(true)
})

test('trocas rápidas: vale a última escolha (livre não termina travada)', async () => {
  const w = fakeWindow()
  const apply = createWindowSizer(w.api)
  const a = apply('1280x720')
  const b = apply('livre')
  await Promise.all([a, b])
  expect(w.state.resizable).toBe(true)
  expect(w.state.maximizable).toBe(true)
})
