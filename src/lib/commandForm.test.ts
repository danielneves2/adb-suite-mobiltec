import type { Command } from './catalogTypes'
import { EMPTY_FORM, FORM_CATEGORIES, categoryOptions, commandToForm, formToCommand, normalizeCategory, previewLines, stripSerial, validateCommandForm, type CommandFormData } from './commandForm'

const form = (over: Partial<CommandFormData> = {}): CommandFormData => ({
  ...EMPTY_FORM,
  nome: 'Abrir Wi-Fi',
  comando: 'adb shell am start -a android.settings.WIFI_SETTINGS',
  ...over,
})

describe('validateCommandForm', () => {
  test('erros na ordem da referência', () => {
    expect(validateCommandForm(form({ nome: '  ', comando: '' }))).toBe('Dá um nome pro comando.')
    expect(validateCommandForm(form({ comando: '  \n ' }))).toBe('Escreve o comando adb.')
    expect(validateCommandForm(form({ comando: 'shell ls' }))).toBe('Cada linha precisa começar com adb.')
    expect(validateCommandForm(form({ comando: 'adb shell ls\nshell ls' }))).toBe('Cada linha precisa começar com adb.')
  })
  test('erros do montador aparecem (aspas, marcador desconhecido)', () => {
    expect(validateCommandForm(form({ comando: 'adb shell "ls' }))).toBe('Aspas sem fechar no comando.')
    expect(validateCommandForm(form({ comando: 'adb shell ls {xyz}' }))).toBe('Marcador desconhecido: {xyz}.')
  })
  test('comando válido, com linhas em branco e marcadores do time', () => {
    expect(validateCommandForm(form())).toBeNull()
    expect(validateCommandForm(form({ comando: 'adb shell pm clear {pacote}\n\nadb pull /sdcard/x "{d}"', parametro: 'pkg' }))).toBeNull()
  })
})

describe('formToCommand', () => {
  const now = new Date('2026-11-25T14:00:00Z')
  test('vira comando local do técnico', () => {
    const c = formToCommand(form({ resumo: ' Abre o Wi-Fi ', pede_confirmacao: true }), 'local-1', now, 'Daniel')
    expect(c).toMatchObject({
      id: 'local-1',
      nome: 'Abrir Wi-Fi',
      categoria: 'Meus comandos',
      resumo: 'Abre o Wi-Fi',
      comando: 'adb shell am start -a android.settings.WIFI_SETTINGS',
      parametro: null,
      pede_confirmacao: true,
      gera_arquivo: false,
      modo: 'normal',
      oficial: false,
      excluido: false,
      atualizado_em: '2026-11-25T14:00:00.000Z',
      autor: 'Daniel',
    })
  })
  test('tira linhas em branco e marca gera_arquivo quando usa {d}', () => {
    const c = formToCommand(form({ comando: 'adb pull /sdcard/a.txt "{d}"\n\n' }), 'local-2', now)
    expect(c.comando).toBe('adb pull /sdcard/a.txt "{d}"')
    expect(c.gera_arquivo).toBe(true)
  })
  test('ida e volta pelo formulário', () => {
    const f = form({ categoria: 'Apps', parametro: 'pkg', comando: 'adb shell pm clear {pacote}', resumo: 'x', pede_confirmacao: true })
    expect(commandToForm(formToCommand(f, 'local-3', now) as Command)).toEqual(f)
  })
})

test('stripSerial tira o -s de cada linha (Salvar como comando)', () => {
  expect(stripSerial('adb -s R58N shell ls\nadb -s R58N pull /a "C:\\x"')).toBe('adb shell ls\nadb pull /a "C:\\x"')
})

test('prévia injeta o -s e troca o valor pelo exemplo do tipo', () => {
  expect(previewLines(form({ comando: 'adb shell pm clear {pacote}', parametro: 'pkg' }), 'R58N', 'C:\\Saidas\\A54')).toEqual([
    'adb -s R58N shell pm clear br.com.mobiltec.c4m.android.agent',
  ])
  expect(previewLines(form({ comando: '' }), 'R58N', 'C:\\x')).toEqual(['adb -s R58N …'])
  expect(previewLines(form({ comando: 'adb shell "ls' }), 'R58N', 'C:\\x')).toEqual(['adb shell "ls'])
})

describe('categorias', () => {
  test('opções: as fixas, depois as criadas pelo técnico (sem repetir), e Outros no fim', () => {
    expect(categoryOptions(['Rede', 'Apps', 'rede', 'Outros'])).toEqual([...FORM_CATEGORIES, 'Rede', 'Outros'])
  })
  test('categoria vazia ou longa demais é erro', () => {
    expect(validateCommandForm(form({ categoria: '  ' }))).toBe('Dá um nome pra categoria.')
    expect(validateCommandForm(form({ categoria: 'x'.repeat(25) }))).toBe('Nome da categoria com no máximo 24 caracteres.')
  })
  test('categoria digitada igual a uma existente usa a grafia existente', () => {
    expect(normalizeCategory(' rede ', ['Rede', 'Apps'])).toBe('Rede')
    expect(normalizeCategory('apps', ['Rede'])).toBe('Apps')
    expect(normalizeCategory('Wi-Fi', ['Rede'])).toBe('Wi-Fi')
  })
})
