import { useState } from 'react'
import { WINDOW_SIZES } from '../lib/settings'
import { Icon } from './icons'

export interface SettingsProps {
  windowSize: string
  onWindowSize: (id: string) => void
  baseDir: string
  onChangeBase: (dir: string) => void
  onOpenBase: () => void
  adbVersion: string | null
  onClose: () => void
}

export function Settings({ windowSize, onWindowSize, baseDir, onChangeBase, onOpenBase, adbVersion, onClose }: SettingsProps) {
  const [dir, setDir] = useState(baseDir)

  return (
    <div className="config">
      <div className="config-cabecalho">
        <div>
          <h1 className="comando-nome">Configurações</h1>
          <p className="comando-resumo">Valem só para este computador.</p>
        </div>
        <button type="button" className="btn" onClick={onClose}>
          Fechar
        </button>
      </div>

      <section className="config-secao" aria-labelledby="cfg-janela">
        <h2 className="secao-titulo" id="cfg-janela">
          Tamanho da janela
        </h2>
        <p className="config-ajuda">Um tamanho fixo trava a janela e deixa a tela sempre igual. Em “Livre”, dá pra redimensionar e maximizar.</p>
        <div className="config-opcoes" role="radiogroup" aria-labelledby="cfg-janela">
          {WINDOW_SIZES.map((o) => {
            const checked = o.id === windowSize
            return (
              <label key={o.id} className={`config-opcao${checked ? ' selecionada' : ''}`}>
                <input type="radio" name="tamanho-janela" value={o.id} checked={checked} onChange={() => onWindowSize(o.id)} />
                <span className={`marcador${checked ? ' cheio' : ''}`} aria-hidden="true" />
                <span>
                  <strong className={o.id === 'livre' ? '' : 'mono'}>{o.label}</strong>
                  <span className="config-detalhe">{o.detail}</span>
                </span>
              </label>
            )
          })}
        </div>
      </section>

      <section className="config-secao" aria-labelledby="cfg-pasta">
        <h2 className="secao-titulo" id="cfg-pasta">
          Pasta de saída
        </h2>
        <p className="config-ajuda">Cada aparelho ganha uma subpasta própria dentro dela.</p>
        <form
          className="config-linha"
          onSubmit={(e) => {
            e.preventDefault()
            onChangeBase(dir)
          }}
        >
          <input className="campo" aria-label="Pasta de saída" value={dir} onChange={(e) => setDir(e.target.value)} spellCheck={false} />
          <button type="submit" className="btn btn-primario">
            Salvar pasta
          </button>
          <button type="button" className="btn" onClick={onOpenBase}>
            <Icon name="abrir" size={14} />
            Abrir pasta
          </button>
        </form>
      </section>

      <section className="config-secao" aria-labelledby="cfg-sobre">
        <h2 className="secao-titulo" id="cfg-sobre">
          Sobre
        </h2>
        <dl className="config-sobre">
          <dt>Versão do app</dt>
          <dd className="mono">0.1.0</dd>
          <dt>adb embutido</dt>
          <dd className="mono">{adbVersion ?? '—'}</dd>
        </dl>
      </section>
    </div>
  )
}
