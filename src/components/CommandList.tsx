import { useEffect, useRef } from 'react'
import type { Command } from '../lib/catalogTypes'
import { Icon, StarIcon } from './icons'

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
}

export function CommandList(p: Props) {
  const searchRef = useRef<HTMLInputElement>(null)

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
      <div className="lista-cabecalho">
        <h2 className="secao-titulo">{p.title}</h2>
        <span className="lista-contagem mono">{String(p.commands.length).padStart(2, '0')}</span>
      </div>
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
                    <Icon name={c.oficial === false ? 'Meus' : c.categoria} size={18} />
                  </span>
                  <span className="lista-item-texto">
                    <span className="lista-item-nome">{c.nome}</span>
                    {p.showCategory && <span className="lista-item-categoria">{c.categoria}</span>}
                  </span>
                  {c.oficial === false && <span className="lista-item-local">LOCAL</span>}
                  {c.pede_confirmacao && <span className="lista-item-perigo">[!]</span>}
                </button>
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
