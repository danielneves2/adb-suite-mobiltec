import rawCatalog from '../../data/catalog.json'
import type { Catalog, Command } from './catalogTypes'
import { buildCommand, type BuildContext } from './commandBuilder'

const catalog = rawCatalog as unknown as Catalog
const ctx: BuildContext = {
  serial: 'R58M',
  value: 'x',
  deviceDir: 'C:\\ADB-Suite\\Saidas\\Samsung-A10_R58M',
  now: new Date(2026, 10, 24, 14, 32, 5),
}
const byId = (id: string): Command => {
  const c = catalog.comandos.find((x) => x.id === id)
  if (!c) throw new Error(`sem comando ${id}`)
  return c
}

test('46 comandos', () => expect(catalog.comandos).toHaveLength(46))
test('versão 2', () => expect(catalog.versao).toBe(2))

test.each(catalog.comandos)('$id monta sem erro', (c) => {
  const r = buildCommand(c.comando, { ...ctx, value: c.exemplo ?? 'x' }, { requiresValue: c.parametro !== null })
  expect(r.steps.length).toBeGreaterThan(0)
  for (const extra of [c.comando_parar, c.comando_depois]) if (extra) buildCommand(extra, ctx)
})

test.each(catalog.comandos.filter((c) => c.atalhos?.length))('$id: todos os atalhos montam', (c) => {
  for (const a of c.atalhos ?? []) {
    const r = buildCommand(c.comando, { ...ctx, value: a.valor }, { requiresValue: c.parametro !== null, allowEmptyValue: true })
    expect(r.steps[0].args, a.rotulo).not.toContain('')
  }
})
test('listarpasta aceita caminho com espaço', () =>
  expect(buildCommand(byId('listarpasta').comando, { ...ctx, value: '/sdcard/My Files' }).steps[0].args.slice(-3)).toEqual(['ls', '-la', "'/sdcard/My Files'"]))

test('sem data fixa, <…> nem IP fixo', () => {
  for (const c of catalog.comandos) expect(c.comando, c.id).not.toMatch(/\d{8}_\d{4}|\d{4}-\d{2}-\d{2}|<[^>]+>|192\.168\./)
})
test('nenhum findstr', () => expect(JSON.stringify(catalog)).not.toMatch(/findstr/i))
test('modos', () => {
  expect(byId('logcontinuo').modo).toBe('continuo')
  expect(byId('gravar').modo).toBe('continuo')
  expect(byId('shell').modo).toBe('terminal')
})
test('ações extras', () => {
  expect(byId('print').acao_extra).toBe('copiar_imagem')
  expect(byId('diag').acao_extra).toBe('zipar')
})
test('extrair usa {anterior}', () => expect(buildCommand(byId('extrair').comando, ctx).steps[1].usesPrevious).toBe(true))
test('diag grava em subpasta', () => {
  for (const line of byId('diag').comando.split('\n')) expect(line).toMatch(/\{d\}\\diagnostico_\{agora\}\\/)
})
test('wifi pede IP', () => {
  expect(byId('wifi').parametro).toBe('text')
  expect(byId('wifi').comando).toContain('adb connect {p}:5555')
})
test('gravar para e puxa o vídeo', () => {
  expect(byId('gravar').comando_parar).toBe('adb -s {s} shell pkill -INT screenrecord')
  expect(byId('gravar').comando_depois).toBe('adb -s {s} pull /sdcard/gravacao.mp4 "{d}\\gravacao_{agora}.mp4"')
})
test('logcat por app resolve o pid no aparelho', () =>
  expect(byId('logcat').comando).toBe('adb -s {s} shell "logcat -v threadtime --pid=$(pidof {p})"'))
