import { useEffect, useRef, useState } from 'react'
import type { Command } from '../lib/catalogTypes'
import { Icon, StarIcon } from './icons'

/** Ações do cabeçalho quando a lista mostra uma categoria criada pelo técnico. */
export interface CategoryActions {
  name: string
  onRename: (to: string) => void
  onDelete: () => void
}

interface Props {
  title: string
  commands: Command[]
  selectedId: string | null
  showCategory: boolean
  emptyText: string
  search: string
  onSearch: (q: string) => void
  onSelect: (id: string) => void
  onNew: () => void
  pinned: string[]
  onTogglePin: (id: string) => void
  /** Comandos do técnico: editar/excluir direto na lista. */
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  categoryActions?: CategoryActions
}

const plural = (n: number) => (n === 1 ? '1 comando dela vai' : `${n} comandos dela vão`)

function CategoryHeader({ title, count, actions }: { title: string; count: number; actions?: CategoryActions }) {
  const [mode, setMode] = useState<'ver' | 'renomear' | 'excluir'>('ver')
  const [name, setName] = useState(title)

  // Trocou de categoria: volta ao normal.
  useEffect(() => {
    setMode('ver')
    setName(title)
  }, [title])

  if (actions && mode === 'renomear') {
    return (
      <form
        className="lista-cabecalho lista-renomear"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) actions.onRename(name.trim())
          setMode('ver')
        }}
      >
        <input
          className="campo campo-ui"
          aria-label="Novo nome da categoria"
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setMode('ver')}
          autoFocus
        />
        <button type="submit" className="btn btn-mini btn-primario">
          OK
        </button>
      </form>
    )
  }

  return (
    <>
      <div className="lista-cabecalho">
        <h2 className="secao-titulo">{title}</h2>
        <span className="lista-contagem mono">{String(count).padStart(2, '0')}</span>
        {actions && (
          <span className="lista-cabecalho-acoes">
            <button type="button" className="btn-icone" aria-label="Renomear categoria" title="Renomear categoria" onClick={() => setMode('renomear')}>
              <Icon name="lapis" size={14} />
            </button>
            <button type="button" className="btn-icone" aria-label="Excluir categoria" title="Excluir categoria" onClick={() => setMode('excluir')}>
              <Icon name="lixeira" size={14} />
            </button>
          </span>
        )}
      </div>
      {actions && mode === 'excluir' && (
        <div className="confirmar" role="alertdialog" aria-label="Excluir categoria">
          <span>
            Excluir a categoria “{title}”? {plural(count)} para Meus comandos.
          </span>
          <span className="confirmar-botoes">
            <button type="button" className="btn btn-mini" onClick={() => setMode('ver')}>
              Não
            </button>
            <button
              type="button"
              className="btn btn-mini btn-primario"
              onClick={() => {
                setMode('ver')
                actions.onDelete()
              }}
            >
              Sim, excluir
            </button>
          </span>
        </div>
      )}
    </>
  )
}

export function CommandList(p: Props) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Ctrl+K foca a busca de qualquer lugar do app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <aside className="lista" aria-label="Comandos">
      <CategoryHeader title={p.title} count={p.commands.length} actions={p.categoryActions} />
      <div className="busca">
        <Icon name="busca" size={16} />
        <label className="sr-only" htmlFor="busca">
          Buscar em todos os comandos
        </label>
        <input
          id="busca"
          ref={searchRef}
          className="busca-input"
          type="search"
          placeholder="Buscar comandos…"
          value={p.search}
          onChange={(e) => p.onSearch(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <kbd>Ctrl K</kbd>
      </div>
      {p.commands.length === 0 ? (
        <p className="lista-vazia">{p.emptyText}</p>
      ) : (
        <ul className="lista-itens">
          {p.commands.map((c) => {
            const selected = c.id === p.selectedId
            const isPinned = p.pinned.includes(c.id)
            const mine = c.oficial === false
            if (confirmDelete === c.id && p.onDelete) {
              return (
                <li key={c.id} className="lista-linha confirmando" role="alertdialog" aria-label={`Excluir ${c.nome}`}>
                  <span className="confirmar-texto">Excluir “{c.nome}”?</span>
                  <span className="confirmar-botoes">
                    <button type="button" className="btn btn-mini" onClick={() => setConfirmDelete(null)}>
                      Não
                    </button>
                    <button
                      type="button"
                      className="btn btn-mini btn-primario"
                      onClick={() => {
                        setConfirmDelete(null)
                        p.onDelete?.(c.id)
                      }}
                    >
                      Sim, excluir
                    </button>
                  </span>
                </li>
              )
            }
            return (
              <li key={c.id} className={`lista-linha${selected ? ' selecionado' : ''}`}>
                <button
                  type="button"
                  className="lista-item"
                  title={c.resumo}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => p.onSelect(c.id)}
                >
                  <span className="lista-item-icone">
                    <Icon name={mine ? 'Meus' : c.categoria} size={18} />
                  </span>
                  <span className="lista-item-texto">
                    <span className="lista-item-nome">{c.nome}</span>
                    {p.showCategory && <span className="lista-item-categoria">{c.categoria}</span>}
                  </span>
                  {c.pede_confirmacao && <span className="lista-item-perigo">[!]</span>}
                </button>
                {mine && p.onEdit && (
                  <button type="button" className="lista-acao" aria-label={`Editar ${c.nome}`} title="Editar" onClick={() => p.onEdit?.(c.id)}>
                    <Icon name="lapis" size={14} />
                  </button>
                )}
                {mine && p.onDelete && (
                  <button type="button" className="lista-acao lista-acao-perigo" aria-label={`Excluir ${c.nome}`} title="Excluir" onClick={() => setConfirmDelete(c.id)}>
                    <Icon name="lixeira" size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className={`lista-estrela${isPinned ? ' fixada' : ''}`}
                  aria-label={`${isPinned ? 'Desafixar' : 'Fixar'} ${c.nome}`}
                  aria-pressed={isPinned}
                  onClick={() => p.onTogglePin(c.id)}
                >
                  <StarIcon size={16} filled={isPinned} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="lista-rodape">
        <button type="button" className="btn btn-novo" onClick={p.onNew}>
          + Novo comando
        </button>
      </div>
    </aside>
  )
}
