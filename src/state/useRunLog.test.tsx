// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import type { RunView } from './useRunner'
import { useRunLog } from './useRunLog'

const base: RunView = { runId: null, phase: 'idle', display: null, lines: [], result: null, error: null, extra: '' }
const result = (output: string) => ({ output, exitCode: 0, durationMs: 600, display: 'adb x', at: new Date() })

test('mesmo run re-renderizado com objeto novo (saída extra) registra uma vez só', () => {
  const log = vi.fn()
  const { rerender } = renderHook(({ v }) => useRunLog(v, 'Gravar tela', log), { initialProps: { v: base } })
  rerender({ v: { ...base, runId: 'a', phase: 'running' } })
  rerender({ v: { ...base, runId: 'a', phase: 'done', result: result('') } })
  rerender({ v: { ...base, runId: 'a', phase: 'done', result: result('1 file pulled\n'), extra: '1 file pulled\n' } })
  rerender({ v: { ...base, runId: 'a', phase: 'done', result: result('1 file pulled\n'), extra: '1 file pulled\n' } })
  expect(log).toHaveBeenCalledTimes(1)
  expect(log).toHaveBeenCalledWith('CMD', 'Gravar tela — concluído em 0,6 s')
})

test('dois runs com o mesmo erro registram os dois', () => {
  const log = vi.fn()
  const { rerender } = renderHook(({ v }) => useRunLog(v, 'Info', log), { initialProps: { v: base } })
  rerender({ v: { ...base, runId: 'a', phase: 'error', error: "error: device offline\nmais" } })
  rerender({ v: { ...base, runId: 'b', phase: 'error', error: "error: device offline\nmais" } })
  expect(log).toHaveBeenCalledTimes(2)
  expect(log).toHaveBeenLastCalledWith('ERRO', 'Info — error: device offline')
})

test('código de saída diferente de 0 vira ERRO', () => {
  const log = vi.fn()
  renderHook(() => useRunLog({ ...base, runId: 'a', phase: 'done', result: { ...result('x'), exitCode: 1 } }, 'Desinstalar', log))
  expect(log).toHaveBeenCalledWith('ERRO', 'Desinstalar — erro (código 1)')
})
