import { RAIL } from '../lib/appLogic'
import { Icon } from './icons'

interface Props {
  active: string
  searching: boolean
  onSelect: (key: string) => void
}

export function Rail({ active, searching, onSelect }: Props) {
  return (
    <nav className="rail" aria-label="Categorias">
      {RAIL.map((r, i) => {
        const isActive = !searching && r.key === active
        return (
          <button
            key={r.key}
            type="button"
            className={`rail-item${isActive ? ' ativo' : ''}${i === 0 ? ' rail-inicio' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            title={r.title}
            onClick={() => onSelect(r.key)}
          >
            <Icon name={r.key} size={18} />
            <span className="rail-texto">{r.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
