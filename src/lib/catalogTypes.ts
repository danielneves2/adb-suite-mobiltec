// Nomes de campo em português: espelham as colunas da tabela `comandos`.

export type ParamKind = 'pkg' | 'apk' | 'file' | 'path' | 'text'
export type CommandMode = 'normal' | 'continuo' | 'terminal'
export type ExtraAction = 'copiar_imagem' | 'zipar'

export interface Shortcut {
  rotulo: string
  valor: string
}

export interface Command {
  id: string
  categoria: string
  nome: string
  resumo: string
  comando: string
  parametro: ParamKind | null
  rotulo_parametro?: string | null
  exemplo?: string | null
  atalhos?: Shortcut[] | null
  escolha?: { pergunta: string; opcao_outro: string | null } | null
  pede_confirmacao?: boolean
  texto_confirmacao?: string | null
  gera_arquivo?: boolean
  modo?: CommandMode
  comando_parar?: string | null
  comando_depois?: string | null
  acao_extra?: ExtraAction | null
  saida_exemplo?: string
  oficial?: boolean
  excluido?: boolean
  atualizado_em?: string
  /** Nome de quem criou/editou (comandos do time). */
  autor?: string | null
}

export interface Catalog {
  versao: number
  categorias: string[]
  fixados_padrao: string[]
  pacotes_sugeridos: string[]
  comandos: Command[]
}
