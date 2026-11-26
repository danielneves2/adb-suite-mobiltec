import { deviceName, type DeviceInfo } from '../lib/appLogic'
import type { SyncStatus } from '../state/useTeamSync'
import type { UpdateState } from '../state/useUpdater'
import { Icon } from './icons'

interface Props {
  deviceDir: string | null
  baseDir: string
  onChangeBase: (dir: string) => void
  onOpen: () => void
  message: string | null
  deviceCount: number
  device: DeviceInfo | null
  adbOk: boolean
  /** Abre a janela do Windows para escolher a pasta (null = cancelou). */
  pickFolder: (defaultPath: string) => Promise<string | null>
  /** Atualização automática (só aparece quando há versão nova ou durante a instalação). */
  update?: UpdateState
  onInstallUpdate?: () => void
  /** Comando rodando: instalar agora derrubaria o trabalho. */
  updateBlocked?: boolean
  /** Catálogo do time (sem servidor = "local", não mostra nada). */
  syncStatus?: SyncStatus
}

const SYNC_TEXT: Record<Exclude<SyncStatus, 'local'>, { text: string; cls: string; title: string }> = {
  online: { text: 'Sincronizado', cls: 'status-ok', title: 'Comandos do time em dia (confere a cada 30 s)' },
  syncing: { text: 'Sincronizando…', cls: '', title: 'Buscando os comandos do time' },
  offline: { text: 'Sem conexão', cls: 'status-alerta', title: 'Sem conexão com o servidor: o catálogo continua funcionando, mas criar/editar/excluir espera a conexão voltar' },
}

function SyncItem({ status }: { status?: SyncStatus }) {
  if (!status || status === 'local') return null
  const s = SYNC_TEXT[status]
  return (
    <span className={`status-item ${s.cls}`} title={s.title}>
      <Icon name={status === 'offline' ? 'alerta' : 'camadas'} size={14} />
      {s.text}
    </span>
  )
}

function UpdateItem({ update, onInstall, blocked }: { update?: UpdateState; onInstall?: () => void; blocked?: boolean }) {
  if (update?.kind === 'available')
    return (
      <span className="status-item status-atualizacao">
        <Icon name="seta-cima" size={14} />
        Versão {update.version} disponível
        <button
          type="button"
          className="btn btn-mini btn-atualizar"
          disabled={blocked}
          title={blocked ? 'Pare o comando antes de atualizar' : 'Baixa, instala e reabre o app'}
          onClick={onInstall}
        >
          Atualizar agora
        </button>
      </span>
    )
  if (update?.kind === 'downloading')
    return (
      <span className="status-item status-atualizacao" role="status">
        <Icon name="seta-cima" size={14} />
        {update.percent === null ? 'Baixando atualização…' : `Baixando atualização ${update.percent}%`}
      </span>
    )
  if (update?.kind === 'restarting')
    return (
      <span className="status-item status-atualizacao" role="status">
        Reiniciando…
      </span>
    )
  return null
}

/** Barra de status no estilo de IDE: aparelhos, aparelho atual, Android, ADB e pasta de saída. */
export function StatusBar({ deviceDir, baseDir, onChangeBase, onOpen, message, deviceCount, device, adbOk, pickFolder, update, onInstallUpdate, updateBlocked, syncStatus }: Props) {
  const shown = deviceDir ?? baseDir
  const ready = device?.state === 'device'

  return (
    <footer className="status">
      <span className="status-item">
        <span className={`ponto ${deviceCount > 0 ? 'ponto-ok' : 'ponto-vazio'}`} aria-hidden="true" />
        {deviceCount === 1 ? '1 dispositivo conectado' : `${deviceCount} dispositivos conectados`}
      </span>
      {device && ready && (
        <>
          <span className="status-item">
            <Icon name="Aparelho" size={14} />
            {deviceName(device)}
          </span>
          <span className="status-item">Android {device.android ?? '?'}</span>
        </>
      )}
      <span className={`status-item ${adbOk ? 'status-ok' : 'status-erro'}`}>
        <Icon name={adbOk ? 'ok' : 'alerta'} size={14} />
        {adbOk ? 'ADB: OK' : 'ADB: erro'}
      </span>
      <span className="status-espaco" />
      <SyncItem status={syncStatus} />
      <UpdateItem update={update} onInstall={onInstallUpdate} blocked={updateBlocked} />
      {message && (
        <span className="status-mensagem" role="status">
          {message}
        </span>
      )}
      <span className="status-item status-pasta-grupo">
        <Icon name="pasta" size={14} />
        <span className="status-rotulo">Pasta de saída:</span>
        <span className="status-pasta mono" title={shown}>
          {shown}
        </span>
        <button
          type="button"
          className="btn btn-mini"
          title="Escolher outra pasta"
          onClick={async () => {
            const chosen = await pickFolder(baseDir)
            if (chosen) onChangeBase(chosen)
          }}
        >
          Alterar…
        </button>
        <button type="button" className="btn btn-mini" onClick={onOpen} aria-label="Abrir" title="Abrir a pasta no Explorer">
          <Icon name="abrir" size={14} />
        </button>
      </span>
    </footer>
  )
}
