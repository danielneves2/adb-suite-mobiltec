import { buildCommand, buildFreeCommand, formatTimestamp, type BuildContext, type BuildOptions } from './commandBuilder'

const ctx: BuildContext = {
  serial: 'R58M',
  value: 'br.com.x',
  deviceDir: 'C:\\ADB-Suite\\Saidas\\Samsung-A10_R58M',
  now: new Date(2026, 10, 24, 14, 32, 5),
}
const build = (t: string, c: BuildContext = ctx, o?: BuildOptions) => buildCommand(t, c, o)

describe('buildCommand', () => {
  test('injeta -s', () => expect(build('adb shell wm size').steps[0].args).toEqual(['-s', 'R58M', 'shell', 'wm', 'size']))
  test('troca {s} e mantém -s', () =>
    expect(build('adb -s {s} shell pm path {p}').steps[0].args).toEqual(['-s', 'R58M', 'shell', 'pm', 'path', 'br.com.x']))
  test('-s com outro serial é trocado', () => expect(build('adb -s ZZZ shell ls').steps[0].args).toEqual(['-s', 'R58M', 'shell', 'ls']))
  test('aliases', () => {
    for (const a of ['{pacote}', '{arquivo}', '{caminho}', '{texto}', '{pasta}'])
      expect(build(`adb uninstall ${a}`).steps[0].args).toEqual(['-s', 'R58M', 'uninstall', 'br.com.x'])
  })
  test('sem serial', () => {
    expect(build('adb devices -l').steps[0].args).toEqual(['devices', '-l'])
    expect(build('adb kill-server').steps[0].args).toEqual(['kill-server'])
    expect(build('adb connect 1.2.3.4:5555').steps[0].args).toEqual(['connect', '1.2.3.4:5555'])
  })
  test('remove variantes do executável', () => {
    for (const exe of ['adb', 'adb.exe', '.\\adb', './adb', '.\\adb.exe'])
      expect(build(`${exe} shell ls`).steps[0].args).toEqual(['-s', 'R58M', 'shell', 'ls'])
  })
  test('agora', () => expect(formatTimestamp(ctx.now)).toBe('20261124_1432'))
  test('agora com zero à esquerda', () => expect(formatTimestamp(new Date(2026, 0, 5, 3, 7))).toBe('20260105_0307'))
  test('redirect com pasta com espaço', () => {
    const s = build('adb -s {s} logcat -d > "{d}\\log{agora}.txt"', { ...ctx, deviceDir: 'C:\\X\\Samsung-Galaxy A10_R58M' }).steps[0]
    expect(s.args).toEqual(['-s', 'R58M', 'logcat', '-d'])
    expect(s.redirectTo).toBe('C:\\X\\Samsung-Galaxy A10_R58M\\log20261124_1432.txt')
  })
  test('> entre aspas não é redirecionamento', () => {
    const s = build('adb shell "echo a > /sdcard/x"').steps[0]
    expect(s.redirectTo).toBeUndefined()
    expect(s.args.at(-1)).toBe('echo a > /sdcard/x')
  })
  test('pull com {d} vira 1 arg', () =>
    expect(build('adb pull "{p}" "{d}"', { ...ctx, value: '/sdcard/Meus arquivos/a.txt' }).steps[0].args).toEqual([
      '-s',
      'R58M',
      'pull',
      '/sdcard/Meus arquivos/a.txt',
      'C:\\ADB-Suite\\Saidas\\Samsung-A10_R58M',
    ]))
  test('multilinha + anterior', () => {
    const r = build('adb shell pm path {p}\nadb pull {anterior} "{d}\\{p}.apk"')
    expect(r.steps).toHaveLength(2)
    expect(r.steps[0].usesPrevious).toBe(false)
    expect(r.steps[1].usesPrevious).toBe(true)
    expect(r.steps[1].args).toEqual(['-s', 'R58M', 'pull', '{anterior}', 'C:\\ADB-Suite\\Saidas\\Samsung-A10_R58M\\br.com.x.apk'])
  })
  test('CRLF do banco não deixa \\r', () => {
    const r = build('adb shell wm size\r\nadb shell wm density\r\n')
    expect(r.steps).toHaveLength(2)
    expect(r.steps.flatMap((s) => s.args).join('')).not.toContain('\r')
  })
  test('display', () =>
    expect(build('adb shell "pm list packages | grep {p}"').display).toBe('adb -s R58M shell "pm list packages | grep br.com.x"'))
  test('display multilinha e redirect', () =>
    expect(build('adb shell wm size\nadb logcat -d > "{d}\\l.txt"', { ...ctx, deviceDir: 'C:\\A B' }).display).toBe(
      'adb -s R58M shell wm size\nadb -s R58M logcat -d > "C:\\A B\\l.txt"',
    ))
  test('valor vazio', () =>
    expect(() => build('adb uninstall {p}', { ...ctx, value: '  ' })).toThrow(expect.objectContaining({ code: 'missing-value' })))
  test('valor ausente', () =>
    expect(() => build('adb uninstall {p}', { ...ctx, value: undefined })).toThrow(expect.objectContaining({ code: 'missing-value' })))
  test('requiresValue sem {p}', () =>
    expect(() => build('adb shell ls', { ...ctx, value: '' }, { requiresValue: true })).toThrow(
      expect.objectContaining({ code: 'missing-value' }),
    ))
  test('marcador desconhecido', () =>
    expect(() => build('adb shell {xyz}')).toThrow(expect.objectContaining({ code: 'unknown-placeholder', message: 'Marcador desconhecido: {xyz}.' })))
  test('vazio', () => expect(() => build(' \r\n ')).toThrow(expect.objectContaining({ code: 'empty' })))
  test('valor é aparado', () => expect(build('adb uninstall {p}', { ...ctx, value: '  br.com.x ' }).steps[0].args.at(-1)).toBe('br.com.x'))

  describe('aspas da shell do aparelho', () => {
    test('valor em parte entre aspas vira 1 palavra na shell', () =>
      expect(build('adb shell input text "{p}"', { ...ctx, value: "it's $HOME; ls" }).steps[0].args.at(-1)).toBe(`'it'\\''s $HOME; ls'`))
    test('valor com espaço dentro de string de shell', () =>
      expect(build('adb shell "pm list packages | grep {p}"', { ...ctx, value: 'a b|c' }).steps[0].args.at(-1)).toBe(
        "pm list packages | grep 'a b|c'",
      ))
    test('valor seguro não ganha aspas', () =>
      expect(build('adb shell "pm list packages | grep {p}"').steps[0].args.at(-1)).toBe('pm list packages | grep br.com.x'))
    test('placeholder sem aspas vai cru (grant com 2 palavras)', () =>
      expect(build('adb shell pm grant {p}', { ...ctx, value: 'br.com.x android.permission.CAMERA' }).steps[0].args.at(-1)).toBe(
        'br.com.x android.permission.CAMERA',
      ))
    test('args fora da shell nunca levam aspas de sh', () =>
      expect(build('adb install -r "{p}"', { ...ctx, value: "C:\\Downloads\\app d'x.apk" }).steps[0].args.at(-1)).toBe(
        "C:\\Downloads\\app d'x.apk",
      ))
    test('redirect depois de shell não é escapado', () =>
      expect(build('adb shell getprop > "{d}\\{p}.txt"', { ...ctx, value: "a b" }).steps[0].redirectTo).toBe(
        'C:\\ADB-Suite\\Saidas\\Samsung-A10_R58M\\a b.txt',
      ))
    test("'{p}' aninhado dentro de string da shell não permite injeção", () =>
      expect(build(`adb shell "dumpsys package | grep '{p}'"`, { ...ctx, value: "a'; echo INJECTED; '" }).steps[0].args.at(-1)).toBe(
        `dumpsys package | grep 'a'\\''; echo INJECTED; '\\'''`,
      ))
    test("'{p}' aninhado com valor simples fica igual", () =>
      expect(build(`adb shell "grep -A2 '{p}'"`, { ...ctx, value: 'a b; c' }).steps[0].args.at(-1)).toBe(`grep -A2 'a b; c'`))
  })

  describe('valor vazio vindo de atalho', () => {
    test('allowEmptyValue some com o arg (Reiniciar → Normal)', () =>
      expect(build('adb -s {s} reboot {p}', { ...ctx, value: '' }, { allowEmptyValue: true }).steps[0].args).toEqual(['-s', 'R58M', 'reboot']))
    test('sem allowEmptyValue continua exigindo', () =>
      expect(() => build('adb -s {s} reboot {p}', { ...ctx, value: '' })).toThrow(expect.objectContaining({ code: 'missing-value' })))
  })
})

describe('comando livre', () => {
  const free = (input: string) => buildFreeCommand(input, { serial: ctx.serial, deviceDir: ctx.deviceDir, now: ctx.now })
  test('shell …', () => expect(free('shell ls /sdcard').steps[0].args).toEqual(['-s', 'R58M', 'shell', 'ls', '/sdcard']))
  test('adb shell …', () => expect(free('adb shell ls').steps[0].args).toEqual(['-s', 'R58M', 'shell', 'ls']))
  test('.\\adb shell …', () => expect(free('.\\adb shell ls').steps[0].args).toEqual(['-s', 'R58M', 'shell', 'ls']))
  test('adb -s OUTRO troca pelo selecionado', () => expect(free('adb -s ZZZ999 shell ls').steps[0].args).toEqual(['-s', 'R58M', 'shell', 'ls']))
  test('adb devices sem -s', () => expect(free('adb devices').steps[0].args).toEqual(['devices']))
  test('chaves ficam literais', () => expect(free('shell echo {x}').steps[0].args.at(-1)).toBe('{x}'))
  test('> arquivo funciona no livre', () => expect(free('shell getprop > "C:\\t\\p.txt"').steps[0].redirectTo).toBe('C:\\t\\p.txt'))
  test('vazio', () => expect(() => free('   ')).toThrow(expect.objectContaining({ code: 'empty' })))
})
