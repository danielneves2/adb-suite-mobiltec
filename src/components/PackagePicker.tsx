import { useEffect, useRef, useState } from 'react'
import type { PackageKind } from '../lib/adb'
import { filterPackages } from '../lib/packages'
import { Icon } from './icons'

export interface PackagePickerProps {
  serial: string
  deviceName: string
  /** Pacote que já está no campo (aparece marcado). */
  selected: string
  load: (kind: PackageKind) => Promise<string[]>
  onPick: (pkg: string) => void
  onClose: () => void
}

const KINDS: { kind: PackageKind; label: string }[] = [
  { kind: 'user', label: 'Do usuário' },
  { kind: 'system', label: 'Do sistema' },
  { kind: 'all', label: 'Todos' },
]

const countText = (shown: number, total: number) =>
  shown === total ? `${total} ${total === 1 ? 'app' : 'apps'}` : `${shown} de ${total} ${total === 1 ? 'app' : 'apps'}`

/** Painel com os apps instalados no aparelho selecionado; clicar escolhe o pacote. */
export function PackagePicker({ serial, deviceName, selected, load, onPick, onClose }: PackagePickerProps) {
  const [kind, setKind] = useState<PackageKind>('user')
  const [query, setQuery] = useState('')
  const [lists, setLists] = useState<Partial<Record<PackageKind, string[]>>>({})
  const [error, setError] = useState<string | null>(null)
  const requested = useRef<Set<PackageKind>>(new Set())

  // Carrega cada tipo uma vez só (por aparelho: o pai recria o painel ao trocar de aparelho).
  useEffect(() => {
    if (requested.current.has(kind)) return
    requested.current.add(kind)
    setError(null)
    load(kind)
      .then((list) => setLists((l) => ({ ...l, [kind]: list })))
      .catch((e) => {
        requested.current.delete(kind)
        setError(e instanceof Error ? e.message : String(e))
      })
  }, [kind, load, serial])

  const all = lists[kind]
  const shown = all ? filterPackages(all, query) : []

  return (
    <section className="apps" aria-labelledby="apps-titulo">
      <div className="apps-cabecalho">
        <h2 className="secao-titulo" id="apps-titulo">
          Apps do {deviceName}
        </h2>
        <span className="apps-contagem mono">{all ? countText(shown.length, all.length) : ''}</span>
        <span className="apps-espaco" />
        <button type="button" className="btn btn-mini" onClick={onClose}>
          Fechar
        </button>
      </div>
      <div className="apps-filtros">
        <div className="segmentos" role="radiogroup" aria-label="Tipo de app">
          {KINDS.map((k) => (
            <label key={k.kind} className={`segmento${kind === k.kind ? ' ativo' : ''}`}>
              <input type="radio" name="tipo-app" checked={kind === k.kind} onChange={() => setKind(k.kind)} />
              {k.label}
            </label>
          ))}
        </div>
        <div className="busca apps-busca">
          <Icon name="busca" size={15} />
          <input
            className="busca-input"
            type="search"
            aria-label="Filtrar apps"
            placeholder="Filtrar por nome do pacote…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </div>
      </div>
      {error ? (
        <p className="form-erro" role="alert">
          {error}
        </p>
      ) : !all ? (
        <p className="apps-carregando">Lendo os apps do aparelho…</p>
      ) : shown.length === 0 ? (
        <p className="apps-carregando">Nenhum app com esse nome.</p>
      ) : (
        <ul className="apps-lista mono" role="listbox" aria-label="Apps instalados">
          {shown.map((pkg) => (
            <li
              key={pkg}
              role="option"
              aria-selected={pkg === selected}
              className={`apps-item${pkg === selected ? ' selecionado' : ''}`}
              tabIndex={0}
              onClick={() => onPick(pkg)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPick(pkg)
                }
              }}
            >
              {pkg}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
