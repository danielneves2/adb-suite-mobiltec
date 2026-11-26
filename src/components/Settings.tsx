import { useEffect, useState } from 'react'
import { WINDOW_SIZES } from '../lib/settings'
import { initials } from '../lib/user'
import type { UpdateState } from '../state/useUpdater'
import { Icon } from './icons'

export interface SettingsProps {
  windowSize: string
  onWindowSize: (id: string) => void
  baseDir: string
  onChangeBase: (dir: string) => void
  onOpenBase: () => void
  adbVersion: string | null
  onClose: () => void
  userName: string | null
  /** null = sair (volta para a tela de entrada, com os perfis salvos). */
  onUserName: (name: string | null) => void
  /** Tamanhos que cabem nesta tela (os outros ficam desligados). Sem a informação, todos ficam liberados. */
  availableSizes?: string[]
  /** Abre a janela do Windows para escolher a pasta (null = cancelou). */
  pickFolder: (defaultPath: string) => Promise<string | null>
  /** Versão do app instalado (Tauri getVersion). */
  appVersion?: string | null
  /** Atualização automática: estado e ações (Sobre → Procurar atualização). */
  update?: UpdateState
  onCheckUpdate?: () => void
  onInstallUpdate?: () => void
  /** Comando rodando: instalar agora derrubaria o trabalho. */
  updateBlocked?: boolean
}

function updateText(u: UpdateState): string | null {
  switch (u.kind) {
    case 'none':
      return 'Você já está na versão mais nova.'
    case 'available':
      return `Versão ${u.version} disponível.`
    case 'downloading':
      return u.percent === null ? 'Baixando atualização…' : `Baixando atualização ${u.percent}%`
    case 'restarting':
      return 'Reiniciando…'
    case 'error':
      return u.message
    default:
      return null
  }
}

export function Settings({ windowSize, onWindowSize, baseDir, onChangeBase, onOpenBase, adbVersion, onClose, userName, onUserName, availableSizes, pickFolder, appVersion, update = { kind: 'idle' }, onCheckUpdate, onInstallUpdate, updateBlocked }: SettingsProps) {
  const [dir, setDir] = useState(baseDir)
  // A pasta muda por fora (outro usuário, barra de baixo): o campo acompanha.
  useEffect(() => setDir(baseDir), [baseDir])

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

      <section className="config-secao" aria-labelledby="cfg-nome">
        <h2 className="secao-titulo" id="cfg-nome">
          Usuário
        </h2>
        <p className="config-ajuda">Cada nome tem os próprios fixados, pasta, tamanho da janela e comandos neste PC.</p>
        <div className="config-linha config-usuario">
          {userName && (
            <span className="perfil config-perfil">
              <span className="perfil-avatar" aria-hidden="true">
                {initials(userName)}
              </span>
              <span className="perfil-texto">
                <span className="perfil-nome">{userName}</span>
                <span className="perfil-papel">Técnico</span>
              </span>
            </span>
          )}
          <button type="button" className="btn" onClick={() => onUserName(null)}>
            Trocar de usuário
          </button>
        </div>
      </section>

      <section className="config-secao" aria-labelledby="cfg-janela">
        <h2 className="secao-titulo" id="cfg-janela">
          Tamanho da janela
        </h2>
        <p className="config-ajuda">Um tamanho fixo trava a janela e deixa a tela sempre igual. Em “Livre”, dá pra redimensionar e maximizar.</p>
        <div className="config-opcoes" role="radiogroup" aria-labelledby="cfg-janela">
          {WINDOW_SIZES.map((o) => {
            const checked = o.id === windowSize
            const fits = !availableSizes || availableSizes.includes(o.id)
            return (
              <label key={o.id} className={`config-opcao${checked ? ' selecionada' : ''}${fits ? '' : ' desligada'}`}>
                <input type="radio" name="tamanho-janela" value={o.id} checked={checked} disabled={!fits} onChange={() => onWindowSize(o.id)} />
                <span className={`marcador${checked ? ' cheio' : ''}`} aria-hidden="true" />
                <span>
                  <strong className={o.id === 'livre' ? '' : 'mono'}>{o.label}</strong>
                  <span className="config-detalhe">{fits ? o.detail : 'Maior que esta tela'}</span>
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
        <p className="config-ajuda">Cada aparelho ganha uma subpasta própria dentro dela. Escolha na janela do Windows ou cole o caminho e clique em Salvar.</p>
        <form
          className="config-linha"
          onSubmit={(e) => {
            e.preventDefault()
            onChangeBase(dir)
          }}
        >
          <input className="campo" aria-label="Pasta de saída" value={dir} onChange={(e) => setDir(e.target.value)} spellCheck={false} />
          <button
            type="button"
            className="btn btn-primario"
            onClick={async () => {
              const chosen = await pickFolder(dir || baseDir)
              if (chosen) {
                setDir(chosen)
                onChangeBase(chosen)
              }
            }}
          >
            <Icon name="pasta" size={14} />
            Escolher pasta…
          </button>
          <button type="submit" className="btn">
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
          <dd className="mono">{appVersion ?? '—'}</dd>
          <dt>adb embutido</dt>
          <dd className="mono">{adbVersion ?? '—'}</dd>
        </dl>
        {onCheckUpdate && (
          <div className="config-linha config-atualizacao">
            <button type="button" className="btn" onClick={onCheckUpdate} disabled={update.kind === 'checking' || update.kind === 'downloading' || update.kind === 'restarting'}>
              <Icon name="seta-cima" size={14} />
              {update.kind === 'checking' ? 'Procurando…' : 'Procurar atualização'}
            </button>
            {update.kind === 'available' && onInstallUpdate && (
              <button
                type="button"
                className="btn btn-primario"
                onClick={onInstallUpdate}
                disabled={updateBlocked}
                title={updateBlocked ? 'Pare o comando antes de atualizar' : 'Baixa, instala e reabre o app'}
              >
                Atualizar agora
              </button>
            )}
            {updateText(update) && (
              <span className={`config-ajuda${update.kind === 'error' ? ' texto-erro' : ''}`} role="status">
                {updateText(update)}
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
