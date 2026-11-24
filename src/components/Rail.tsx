import { RAIL } from '../lib/appLogic'
import { RailIcon } from './icons'

interface Props {
  active: string
  searching: boolean
  onSelect: (key: string) => void
}

export function Rail({ active, searching, onSelect }: Props) {
  return (
    <nav className="rail" aria-label="Categorias">
      {RAIL.map((r) => {
        const isActive = !searching && r.key === active
        return (
          <button
            key={r.key}
            type="button"
            className={`rail-item${isActive ? ' ativo' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            title={r.title}
            onClick={() => onSelect(r.key)}
          >
            <RailIcon name={r.key} />
            <span>{r.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
