import logo from '../../assets/logo-mobiltec.png'
import { deviceLabel, type DeviceInfo } from '../lib/appLogic'

interface Props {
  devices: DeviceInfo[]
  selectedSerial: string | null
  onSelect: (serial: string) => void
  onDiagnose: () => void
  onCollect: () => void
}

export function TopBar({ devices, selectedSerial, onSelect, onDiagnose, onCollect }: Props) {
  return (
    <header className="topo">
      <div className="topo-marca">
        <img src={logo} alt="" width={30} height={30} />
        <span className="topo-nome">
          ADB SUITE <span className="topo-hifen">-</span> MOBILTEC
        </span>
        <span className="topo-versao">v0.1</span>
      </div>
      <div className="topo-aparelhos">
        <span className="rotulo">Aparelho</span>
        {devices.length === 0 ? (
          <span className="aparelho vazio">
            <span className="marcador" aria-hidden="true" />
            Nenhum aparelho conectado
          </span>
        ) : (
          devices.map((d) => {
            const selected = d.serial === selectedSerial
            const ready = d.state === 'device'
            return (
              <button
                key={d.serial}
                type="button"
                className={`aparelho${selected ? ' selecionado' : ''}`}
                aria-pressed={selected}
                onClick={() => onSelect(d.serial)}
              >
                <span className={`marcador${selected ? ' cheio' : ''}`} aria-hidden="true" />
                <span className="aparelho-texto">
                  <strong>{deviceLabel(d)}</strong>
                  {ready && (
                    <span className="aparelho-detalhe">
                      Android {d.android ?? '?'} <span className="aparelho-serial">{d.serial}</span>
                    </span>
                  )}
                </span>
              </button>
            )
          })
        )}
      </div>
      <div className="topo-acoes">
        <button type="button" className="btn" onClick={onDiagnose}>
          Diagnosticar conexão
        </button>
        <button type="button" className="btn btn-coletar" onClick={onCollect}>
          Coletar diagnóstico
        </button>
      </div>
    </header>
  )
}
