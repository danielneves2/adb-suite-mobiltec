import { useEffect, useRef } from 'react'
import { formatDuration, metaLine, ticketText, type DeviceInfo } from '../lib/appLogic'
import type { RunView } from '../state/useRunner'
import { useCopied } from './useCopied'

export interface OutputPanelProps {
  run: RunView
  device: DeviceInfo | null
  generatesFile: boolean
  onOpenFolder: () => void
  onSave: (text: string) => void
  onRestartServer: () => void
}

function statusText(run: RunView): string {
  if (run.phase === 'running') return 'executando…'
  if (run.phase === 'error') return 'erro'
  if (run.phase === 'done' && run.result) {
    const d = formatDuration(run.result.durationMs)
    return run.result.exitCode === 0 ? `concluído em ${d}` : `erro (código ${run.result.exitCode}) em ${d}`
  }
  return 'aguardando'
}

/** Texto completo da saída (linhas do contínuo + resultado). */
export function outputText(run: RunView): string {
  const lines = run.lines.length ? run.lines.join('\n') + '\n' : ''
  return lines + (run.result?.output ?? '') + (run.phase === 'error' && run.error ? `${run.error}\n` : '')
}

export function OutputPanel({ run, device, generatesFile, onOpenFolder, onSave, onRestartServer }: OutputPanelProps) {
  const copyOut = useCopied()
  const copyTicket = useCopied()
  const body = useRef<HTMLDivElement>(null)
  const text = outputText(run)
  const hasOutput = run.phase === 'done' || run.phase === 'error' || run.lines.length > 0
  // O conflito aparece no erro ou, no "Diagnosticar conexão" (adb devices), no stderr da saída.
  const serverConflict = text.includes("doesn't match this client") || text.includes('Outro adb de versão diferente')

  useEffect(() => {
    if (run.phase === 'running' && body.current) body.current.scrollTop = body.current.scrollHeight
  }, [run.lines.length, run.phase])

  return (
    <section className="saida" aria-label="Saída do comando">
      <div className="saida-barra">
        <strong className="secao-titulo saida-titulo">saida.log</strong>
        <span className="saida-status">{statusText(run)}</span>
        <span className="saida-espaco" />
        {generatesFile && run.phase === 'done' && (
          <button type="button" className="saida-btn" onClick={onOpenFolder}>
            Abrir pasta
          </button>
        )}
        <button type="button" className="saida-btn" disabled={!hasOutput} onClick={() => onSave(text)}>
          Salvar saída
        </button>
        <button type="button" className="saida-btn" disabled={!hasOutput} onClick={() => void copyOut.copy(text)}>
          {copyOut.copied ? 'Copiado ✓' : 'Copiar saída'}
        </button>
        <button
          type="button"
          className="saida-btn saida-btn-chamado"
          disabled={!hasOutput || !device}
          onClick={() => device && void copyTicket.copy(ticketText(device, run.display ?? '', text, run.result?.at ?? new Date()))}
        >
          {copyTicket.copied ? 'Copiado ✓' : 'Copiar pro chamado'}
        </button>
      </div>
      <div className="saida-corpo terminal" ref={body}>
        {run.phase === 'idle' && <p className="saida-ocioso">&gt; pronto. execute o comando pra ver a saída aqui. █</p>}
        {run.phase === 'running' && run.lines.length === 0 && <p className="saida-executando">executando... █</p>}
        {hasOutput && device && run.result && <p className="saida-meta">{metaLine(device, run.result.at)}</p>}
        {hasOutput && <pre className="saida-texto">{text}</pre>}
        {serverConflict && (
          <button type="button" className="btn btn-primario" onClick={onRestartServer}>
            Reiniciar servidor adb
          </button>
        )}
      </div>
    </section>
  )
}
