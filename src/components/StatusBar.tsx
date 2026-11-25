import { deviceName, type DeviceInfo } from '../lib/appLogic'
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
}

/** Barra de status no estilo de IDE: aparelhos, aparelho atual, Android, ADB e pasta de saída. */
export function StatusBar({ deviceDir, baseDir, onChangeBase, onOpen, message, deviceCount, device, adbOk, pickFolder }: Props) {
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
