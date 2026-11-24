import { splitLines, tokenize, type Token } from './tokenize'

const texts = (tokens: Token[]) => tokens.map((t) => t.map((p) => p.text).join(''))

test('separa por espaço', () => expect(texts(tokenize('adb shell wm size'))).toEqual(['adb', 'shell', 'wm', 'size']))
test('espaços repetidos não criam tokens vazios', () => expect(texts(tokenize('  adb   shell  '))).toEqual(['adb', 'shell']))
test('aspas duplas agrupam e somem', () =>
  expect(texts(tokenize('adb shell "pm list packages | grep x"'))).toEqual(['adb', 'shell', 'pm list packages | grep x']))
test('aspas simples agrupam', () => expect(texts(tokenize("a 'b c'"))).toEqual(['a', 'b c']))
test('aspa simples dentro de duplas é literal', () =>
  expect(texts(tokenize(`a "grep -A2 'Device Owner'"`))).toEqual(['a', "grep -A2 'Device Owner'"]))
test('barra invertida é literal', () => expect(texts(tokenize('pull x "{d}\\{p}.apk"'))).toEqual(['pull', 'x', '{d}\\{p}.apk']))
test('partes marcam quoted', () =>
  expect(tokenize('--x="a b"c')[0]).toEqual([
    { text: '--x=', quoted: false },
    { text: 'a b', quoted: true },
    { text: 'c', quoted: false },
  ]))
test('aspas vazias geram token vazio', () => expect(texts(tokenize('a ""'))).toEqual(['a', '']))
test('aspas sem fechar', () => expect(() => tokenize('a "b')).toThrow(expect.objectContaining({ code: 'unbalanced-quotes' })))
test('splitLines limpa CRLF e vazias', () => expect(splitLines('a\r\n\r\n  b  \n')).toEqual(['a', 'b']))
