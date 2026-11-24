import type { Command } from '../lib/catalogTypes'

interface Props {
  title: string
  commands: Command[]
  selectedId: string | null
  showCategory: boolean
  emptyText: string
  search: string
  onSearch: (q: string) => void
  onSelect: (id: string) => void
}

export function CommandList({ title, commands, selectedId, showCategory, emptyText, search, onSearch, onSelect }: Props) {
  return (
    <aside className="lista" aria-label="Comandos">
      <label className="sr-only" htmlFor="busca">
        Buscar em todos os comandos
      </label>
      <input
        id="busca"
        className="lista-busca"
        type="search"
        placeholder="> buscar em tudo…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      <div className="lista-cabecalho">
        <h2>{title}</h2>
        <span className="lista-contagem">{commands.length}</span>
      </div>
      {commands.length === 0 ? (
        <p className="lista-vazia">{emptyText}</p>
      ) : (
        <ul className="lista-itens">
          {commands.map((c) => {
            const selected = c.id === selectedId
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`lista-item${selected ? ' selecionado' : ''}`}
                  title={c.resumo}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onSelect(c.id)}
                >
                  <span className="lista-item-texto">
                    <span className="lista-item-nome">{selected ? `> ${c.nome}` : c.nome}</span>
                    {showCategory && <span className="lista-item-categoria">{c.categoria}</span>}
                  </span>
                  {c.oficial === false && <span className="lista-item-local">LOCAL</span>}
                  {c.pede_confirmacao && <span className="lista-item-perigo">[!]</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
