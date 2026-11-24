import rawCatalog from '../../data/catalog.json'
import {
  RAIL,
  confirmationText,
  deviceDir,
  deviceFolderName,
  deviceLabel,
  filterCommands,
  formatDuration,
  initialValue,
  metaLine,
  ticketText,
  togglePinned,
  type DeviceInfo,
} from './appLogic'
import type { Catalog, Command } from './catalogTypes'

const catalog = rawCatalog as unknown as Catalog
const byId = (id: string) => catalog.comandos.find((c) => c.id === id) as Command
const a54: DeviceInfo = { serial: 'R58N12ABCDE', state: 'device', brand: 'Samsung', model: 'Galaxy A54', android: '14' }
const at = new Date(2026, 10, 24, 14, 32, 5)

describe('pasta do aparelho', () => {
  test('troca espaços por hífen', () =>
    expect(deviceFolderName({ ...a54, model: 'Galaxy A54 5G', serial: 'R58N' })).toBe('Samsung-Galaxy-A54-5G_R58N'))
  test('mantém parênteses e minúsculas', () =>
    expect(deviceFolderName({ serial: 'X', state: 'device', brand: 'motorola', model: 'moto g(30)' })).toBe('motorola-moto-g(30)_X'))
  test('troca caracteres inválidos do Windows', () =>
    expect(deviceFolderName({ serial: 'Y:1', state: 'device', brand: 'Marca', model: 'A/B:C' })).toBe('Marca-A_B_C_Y_1'))
  test('sem marca/modelo usa só o serial', () => expect(deviceFolderName({ serial: 'ZY22', state: 'device' })).toBe('ZY22'))
  test('deviceDir junta com a pasta base', () =>
    expect(deviceDir('C:\\ADB-Suite\\Saidas', a54)).toBe('C:\\ADB-Suite\\Saidas\\Samsung-Galaxy-A54_R58N12ABCDE'))
  test('deviceDir aceita base com barra no fim', () =>
    expect(deviceDir('C:\\Saidas\\', a54)).toBe('C:\\Saidas\\Samsung-Galaxy-A54_R58N12ABCDE'))
})

describe('lista de comandos', () => {
  const opts = { search: '', rail: 'Apps', pinned: [] as string[] }
  test('ordem da barra de ícones', () =>
    expect(RAIL.map((r) => r.label)).toEqual(['Fixados', 'Apps', 'Pacotes', 'Telas', 'Controle', 'Logs', 'Captura', 'Aparelho', 'Arquivos', 'Conexão', 'Meus']))
  test('busca em nome, comando e resumo, em todas as categorias, sem diferenciar maiúsculas', () => {
    const ids = filterCommands(catalog.comandos, { ...opts, search: 'APK' }).map((c) => c.id)
    expect(ids).toContain('extrair')
    expect(ids).toContain('path')
    expect(ids).toContain('instalar')
  })
  test('categoria filtra', () => expect(filterCommands(catalog.comandos, opts).every((c) => c.categoria === 'Apps')).toBe(true))
  test('fixados na ordem dos fixados', () =>
    expect(filterCommands(catalog.comandos, { ...opts, rail: 'Fixados', pinned: ['foco', 'extrair'] }).map((c) => c.id)).toEqual(['foco', 'extrair']))
  test('Meus = comandos não oficiais', () => {
    const meu: Command = { ...byId('foco'), id: 'meu1', oficial: false }
    expect(filterCommands([...catalog.comandos, meu], { ...opts, rail: 'Meus' }).map((c) => c.id)).toEqual(['meu1'])
  })
  test('excluídos nunca aparecem', () => {
    const excl: Command = { ...byId('foco'), id: 'x', excluido: true }
    expect(filterCommands([excl], { ...opts, search: 'foco' })).toEqual([])
  })
  test('togglePinned adiciona no fim e remove', () => {
    expect(togglePinned(['a'], 'b')).toEqual(['a', 'b'])
    expect(togglePinned(['a', 'b'], 'a')).toEqual(['b'])
  })
})

describe('textos', () => {
  test('confirmação', () =>
    expect(confirmationText(byId('desinstalar'), 'br.com.x', a54)).toBe(
      'Você vai desinstalar br.com.x no Samsung Galaxy A54 (R58N12ABCDE). Isso pode não ter volta.',
    ))
  test('confirmação de comando do time sem texto', () =>
    expect(confirmationText({ ...byId('foco'), texto_confirmacao: null, nome: 'Meu comando' }, '', a54)).toBe(
      'Você vai rodar “Meu comando” no Samsung Galaxy A54 (R58N12ABCDE). Isso pode não ter volta.',
    ))
  test('linha meta', () => expect(metaLine(a54, at)).toBe('# Samsung Galaxy A54 · Android 14 · serial R58N12ABCDE · 24/11/2026 14:32'))
  test('copiar pro chamado', () =>
    expect(ticketText(a54, 'adb -s R58N12ABCDE shell wm size', 'Physical size: 1080x2340', at)).toBe(
      [
        'Aparelho: Samsung Galaxy A54 (Android 14)',
        'Serial: R58N12ABCDE',
        'Data: 24/11/2026 14:32',
        'Comando: adb -s R58N12ABCDE shell wm size',
        '----------------------------------------',
        'Physical size: 1080x2340',
      ].join('\n'),
    ))
  test('duração com vírgula', () => {
    expect(formatDuration(600)).toBe('0,6 s')
    expect(formatDuration(12345)).toBe('12,3 s')
  })
  test('rótulo do aparelho', () => {
    expect(deviceLabel(a54)).toBe('Samsung Galaxy A54')
    expect(deviceLabel({ serial: 'ZY22', state: 'unauthorized' })).toBe('ZY22 · não autorizado — confirme a depuração no aparelho')
    expect(deviceLabel({ serial: 'ZY22', state: 'offline' })).toBe('ZY22 · offline')
  })
})

describe('valor inicial', () => {
  test('1º atalho', () => expect(initialValue(byId('listar'))).toBe('-3'))
  test('pacote sem atalho usa o agente C4M', () => expect(initialValue(byId('desinstalar'))).toBe('br.com.mobiltec.c4m.android.agent'))
  test('sem parâmetro fica vazio', () => expect(initialValue(byId('foco'))).toBe(''))
})
