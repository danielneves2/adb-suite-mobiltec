import { useState } from 'react'
import type { DeviceInfo } from '../lib/appLogic'
import { buildFreeCommand } from '../lib/commandBuilder'
import { stripSerial } from '../lib/commandForm'
import type { RunView } from '../state/useRunner'
import { OutputPanel } from './OutputPanel'

export interface FreeCommandViewProps {
  device: DeviceInfo | null
  run: RunView
  onRunFree: (input: string) => void
  onStop: () => void
  /** Recebe o comando normalizado, sem `-s`, para abrir o formulário. */
  onSaveAsCommand: (comando: string) => void
  onOpenFolder: () => void
  onSaveOutput: (text: string) => void
  onRestartServer: () => void
  flash: (msg: string) => void
}

/** Tela "Comando livre": qualquer comando adb no aparelho selecionado, com saída própria. */
export function FreeCommandView(p: FreeCommandViewProps) {
  const { device } = p
  const [free, setFree] = useState('')
  const ready = !!device && device.state === 'device'
  const running = p.run.phase === 'running'

  const runFree = () => {
    if (running || !ready) return
    if (!free.trim()) {
      p.flash('Digite um comando no campo livre.')
      return
    }
    p.onRunFree(free.trim())
  }

  const saveAsCommand = () => {
    if (!free.trim()) {
      p.flash('Digite um comando no campo livre primeiro.')
      return
    }
    try {
      const built = buildFreeCommand(free.trim(), { serial: device?.serial ?? 'X', deviceDir: '{d}', now: new Date() })
      p.onSaveAsCommand(stripSerial(built.display))
    } catch (e) {
      p.flash(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="comando">
      <span className="rotulo">Ferramentas /</span>
      <h1 className="comando-nome">Comando livre</h1>
      <p className="comando-resumo">
        Qualquer comando adb no aparelho selecionado. Aceita <code className="mono">shell …</code>, <code className="mono">adb shell …</code> ou{' '}
        <code className="mono">adb -s X …</code>: o app sempre troca pelo aparelho escolhido no topo.
      </p>

      <div className="livre-linha">
        <div className="livre-caixa terminal">
          <label className="sr-only" htmlFor="livre">
            Comando livre
          </label>
          <span className="livre-prefixo">$ adb -s {device?.serial ?? '<aparelho>'}</span>
          <input
            id="livre"
            className="livre-input"
            value={free}
            onChange={(e) => setFree(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runFree()
            }}
            placeholder="shell dumpsys battery  (Enter pra rodar)"
            spellCheck={false}
            autoComplete="off"
            autoFocus
          />
        </div>
        {running ? (
          <button type="button" className="btn btn-primario btn-livre" onClick={p.onStop}>
            ■ Parar
          </button>
        ) : (
          <button type="button" className="btn btn-primario btn-livre" disabled={!ready} onClick={runFree}>
            ▶ Rodar
          </button>
        )}
        <button type="button" className="btn btn-livre" onClick={saveAsCommand}>
          Salvar como comando
        </button>
      </div>
      {!ready && <span className="aviso">Conecte um aparelho</span>}

      <OutputPanel
        run={p.run}
        device={device}
        generatesFile={!!p.run.result?.savedTo}
        onOpenFolder={p.onOpenFolder}
        onSave={p.onSaveOutput}
        onRestartServer={p.onRestartServer}
      />
    </div>
  )
}
