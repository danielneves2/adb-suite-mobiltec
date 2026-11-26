import type { Command } from './catalogTypes'
import { applyChanges, mergeCatalog, toPayload } from './sync'

const cmd = (id: string, over: Partial<Command> = {}): Command => ({ id, categoria: 'Apps', nome: id, resumo: '', comando: 'adb shell ls', parametro: null, ...over })

test('applyChanges: novo entra, existente é trocado, excluído fica marcado', () => {
  const cache = { a: cmd('a'), b: cmd('b') }
  const next = applyChanges(cache, [cmd('b', { nome: 'B2' }), cmd('c'), cmd('a', { excluido: true })])
  expect(next.b.nome).toBe('B2')
  expect(next.c).toBeDefined()
  expect(next.a.excluido).toBe(true)
  expect(cache.b.nome).toBe('b') // não muda o original
})

test('mergeCatalog: servidor vence o embutido no mesmo id e mantém campos só do embutido', () => {
  const embedded = [cmd('foco', { nome: 'Ver app em foco', saida_exemplo: 'mCurrentFocus=…' }), cmd('info')]
  const merged = mergeCatalog(embedded, { foco: cmd('foco', { nome: 'Foco (corrigido)' }), meu: cmd('meu', { oficial: false, autor: 'Ana' }) })
  expect(merged.map((c) => c.id)).toEqual(['foco', 'info', 'meu'])
  expect(merged[0].nome).toBe('Foco (corrigido)')
  expect(merged[0].saida_exemplo).toBe('mCurrentFocus=…')
  expect(merged[2].autor).toBe('Ana')
})

test('mergeCatalog: sem cache é o embutido', () => {
  const embedded = [cmd('a')]
  expect(mergeCatalog(embedded, {})).toEqual(embedded)
})

test('toPayload: só os campos que a API aceita, sem oficial/autor/data', () => {
  const p = toPayload(cmd('x', { oficial: true, autor: 'Ana', atualizado_em: '2026', excluido: false, saida_exemplo: 'y', pede_confirmacao: true }))
  expect(p).toEqual({
    id: 'x',
    categoria: 'Apps',
    nome: 'x',
    resumo: '',
    comando: 'adb shell ls',
    parametro: null,
    rotulo_parametro: null,
    exemplo: null,
    atalhos: null,
    escolha: null,
    pede_confirmacao: true,
    texto_confirmacao: null,
    gera_arquivo: false,
    modo: 'normal',
    comando_parar: null,
    comando_depois: null,
    acao_extra: null,
    texto_sem_resultado: null,
  })
})
