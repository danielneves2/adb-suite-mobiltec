import { useState } from 'react'

interface Props {
  deviceDir: string | null
  baseDir: string
  onChangeBase: (dir: string) => void
  onOpen: () => void
  message: string | null
  deviceCount: number
}

export function StatusBar({ deviceDir, baseDir, onChangeBase, onOpen, message, deviceCount }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(baseDir)
  const shown = deviceDir ?? baseDir

  return (
    <footer className="status">
      <span className="rotulo">Pasta de saída</span>
      {editing ? (
        <form
          className="status-form"
          onSubmit={(e) => {
            e.preventDefault()
            onChangeBase(draft)
            setEditing(false)
          }}
        >
          <input className="status-input" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Pasta de saída" autoFocus />
          <button type="submit" className="btn btn-primario btn-mini">
            OK
          </button>
        </form>
      ) : (
        <>
          <span className="status-pasta" title={shown}>
            {shown}
          </span>
          <button
            type="button"
            className="btn btn-mini"
            onClick={() => {
              setDraft(baseDir)
              setEditing(true)
            }}
          >
            Alterar…
          </button>
          <button type="button" className="btn btn-mini" onClick={onOpen}>
            Abrir
          </button>
        </>
      )}
      <span className="status-espaco" />
      {message && (
        <span className="status-mensagem" role="status">
          {message}
        </span>
      )}
      <span className="status-contagem">
        {deviceCount === 1 ? '1 aparelho conectado' : `${deviceCount} aparelhos conectados`}
      </span>
    </footer>
  )
}
