import { filterPackages, suggestedInstalled } from './packages'

const list = ['com.android.chrome', 'com.google.android.youtube', 'br.com.mobiltec.c4m.android.agent', 'com.whatsapp']

test('busca por pedaço do nome, sem diferenciar maiúsculas; vazio devolve tudo', () => {
  expect(filterPackages(list, 'CHROME')).toEqual(['com.android.chrome'])
  expect(filterPackages(list, ' android ')).toEqual(['com.android.chrome', 'com.google.android.youtube', 'br.com.mobiltec.c4m.android.agent'])
  expect(filterPackages(list, '')).toEqual(list)
})

test('sugeridos só aparecem se estiverem instalados no aparelho', () => {
  expect(suggestedInstalled(['br.com.mobiltec.c4m.android.agent', 'com.nao.instalado', 'com.android.chrome'], list)).toEqual([
    'br.com.mobiltec.c4m.android.agent',
    'com.android.chrome',
  ])
  expect(suggestedInstalled(['com.android.chrome'], [])).toEqual([])
})
