import { RAIL } from '../lib/appLogic'
import { initials } from '../lib/user'
import { Icon } from './icons'

interface Props {
  active: string
  searching: boolean
  onSelect: (key: string) => void
  onSettings: () => void
  settingsActive: boolean
  onFree: () => void
  freeActive: boolean
  userName: string | null
  onProfile: () => void
}

export function Rail({ active, searching, onSelect, onSettings, settingsActive, onFree, freeActive, userName, onProfile }: Props) {
  return (
    <nav className="rail" aria-label="Categorias">
      {RAIL.map((r, i) => {
        const isActive = !searching && !settingsActive && !freeActive && r.key === active
        const item = (
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
        if (i > 0) return item
        // "Comando livre" é uma ferramenta: fica logo depois de Início, antes das categorias.
        return [
          item,
          <button
            key="livre"
            type="button"
            className={`rail-item rail-livre${freeActive ? ' ativo' : ''}`}
            aria-current={freeActive ? 'page' : undefined}
            title="Comando livre"
            onClick={onFree}
          >
            <Icon name="terminal" size={18} />
            <span className="rail-texto">Comando livre</span>
          </button>,
        ]
      })}
      <div className="rail-rodape">
      {userName && (
        <button type="button" className="perfil" onClick={onProfile} title="Seu nome (trocar em Configurações)">
          <span className="perfil-avatar" aria-hidden="true">
            {initials(userName)}
          </span>
          <span className="perfil-texto">
            <span className="perfil-nome">{userName}</span>
            <span className="perfil-papel">Técnico</span>
          </span>
        </button>
      )}
      <button
        type="button"
        className={`rail-item rail-config${settingsActive ? ' ativo' : ''}`}
        aria-current={settingsActive ? 'page' : undefined}
        title="Configurações"
        onClick={onSettings}
      >
        <Icon name="config" size={18} />
        <span className="rail-texto">Configurações</span>
      </button>
      </div>
    </nav>
  )
}
