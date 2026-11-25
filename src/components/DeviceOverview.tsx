import android from '../../assets/android-neon.png'
import { deviceName, type DeviceInfo } from '../lib/appLogic'
import { deviceStatus, formatClock, transportOf, type ActivityEntry } from '../lib/overview'
import { Icon } from './icons'
import { useCopied } from './useCopied'

export interface DeviceOverviewProps {
  device: DeviceInfo | null
  entries: ActivityEntry[]
  onDiagnose: () => void
  onCollect: () => void
  onInfo: () => void
  onOpenFolder: () => void
  flash: (msg: string) => void
}

const MAX_SHOWN = 8

const BADGE: Record<string, string> = { ok: 'Conectado (ADB)' }

function Steps({ unauthorized }: { unauthorized: boolean }) {
  return unauthorized ? (
    <ol className="passos">
      <li>Desbloqueie a tela do aparelho.</li>
      <li>No aviso “Permitir depuração USB?”, toque em Permitir. Se não aparecer, desplugue e plugue o cabo de novo e confirme a depuração USB.</li>
    </ol>
  ) : (
    <ol className="passos">
      <li>No aparelho, ative as Opções do desenvolvedor e a Depuração USB.</li>
      <li>Plugue o cabo USB (de dados, não só de carga).</li>
      <li>Aceite o aviso “Permitir depuração USB?” na tela do aparelho.</li>
    </ol>
  )
}

export function DeviceOverview({ device, entries, onDiagnose, onCollect, onInfo, onOpenFolder, flash }: DeviceOverviewProps) {
  const status = deviceStatus(device)
  const ready = device?.state === 'device'
  const copySerial = useCopied()

  return (
    <div className="visao">
      <div className="visao-cabecalho">
        <div>
          <h1 className="secao-titulo visao-titulo">Visão geral do dispositivo</h1>
          <p className="visao-subtitulo">Informações, status e ações rápidas.</p>
        </div>
        <span className={`selo-status selo-${status.tone}`}>
          <span className={`ponto ponto-${status.tone}`} aria-hidden="true" />
          {BADGE[status.tone] ?? status.label}
        </span>
      </div>

      <section className="visao-card" aria-label="Aparelho">
        <div className="visao-grade" aria-hidden="true" />
        <div className="visao-info">
          {device ? (
            <>
              <div className="visao-aparelho">
                <span className="visao-icone">
                  <Icon name="Aparelho" size={26} />
                </span>
                <div>
                  <h2 className="visao-nome">{ready ? deviceName(device) : device.serial}</h2>
                  <span className="visao-serial mono">
                    {device.serial}
                    <button
                      type="button"
                      className="btn-icone"
                      aria-label="Copiar serial"
                      title={copySerial.copied ? 'Copiado ✓' : 'Copiar serial'}
                      onClick={() => {
                        void copySerial.copy(device.serial)
                        flash('Serial copiado.')
                      }}
                    >
                      <Icon name="copiar" size={14} />
                    </button>
                  </span>
                </div>
              </div>
              {ready ? (
                <ul className="blocos" aria-label="Dados do aparelho">
                  <li className="bloco">
                    <Icon name="android" />
                    <span>
                      <span className="bloco-rotulo">Sistema operacional</span>
                      <strong className="bloco-valor">Android {device.android ?? '?'}</strong>
                    </span>
                  </li>
                  <li className="bloco">
                    <Icon name="serial" />
                    <span>
                      <span className="bloco-rotulo">Número de série</span>
                      <strong className="bloco-valor mono">{device.serial}</strong>
                    </span>
                  </li>
                  <li className="bloco">
                    <Icon name="link" />
                    <span>
                      <span className="bloco-rotulo">Status ADB</span>
                      <strong className="bloco-valor valor-ok">{status.label}</strong>
                    </span>
                  </li>
                  <li className="bloco">
                    <Icon name={transportOf(device.serial) === 'USB' ? 'usb' : 'wifi'} />
                    <span>
                      <span className="bloco-rotulo">Transporte</span>
                      <strong className="bloco-valor">{transportOf(device.serial)}</strong>
                    </span>
                  </li>
                </ul>
              ) : (
                <Steps unauthorized={device.state === 'unauthorized'} />
              )}
            </>
          ) : (
            <div className="visao-vazio">
              <h2 className="visao-nome">Nenhum aparelho conectado</h2>
              <Steps unauthorized={false} />
            </div>
          )}
        </div>
        <img className="visao-android" src={android} alt="" />
      </section>

      <section aria-label="Ações rápidas">
        <h2 className="secao-titulo">Ações rápidas</h2>
        <div className="acoes-rapidas">
          <button type="button" className="acao-rapida" onClick={onDiagnose}>
            <Icon name="pulso" size={22} />
            Diagnosticar conexão
          </button>
          <button type="button" className="acao-rapida" onClick={onCollect} disabled={!ready}>
            <Icon name="camadas" size={22} />
            Coletar diagnóstico
          </button>
          <button type="button" className="acao-rapida" onClick={onInfo} disabled={!ready}>
            <Icon name="Aparelho" size={22} />
            Informações do aparelho
          </button>
          <button type="button" className="acao-rapida" onClick={onOpenFolder}>
            <Icon name="pasta" size={22} />
            Arquivos coletados
          </button>
        </div>
      </section>

      <section aria-label="Última atividade">
        <h2 className="secao-titulo">Última atividade</h2>
        {entries.length === 0 ? (
          <p className="atividade-vazia">Nada ainda nesta sessão.</p>
        ) : (
          <ul className="atividade mono">
            {entries.slice(0, MAX_SHOWN).map((e, i) => (
              <li key={`${e.at.getTime()}-${i}`} className="atividade-linha">
                <span className="atividade-hora">[{formatClock(e.at)}]</span>
                <span className={`atividade-tag tag-${e.tag.toLowerCase()}`}>[{e.tag}]</span>
                <span className="atividade-texto">{e.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
