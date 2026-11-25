import { useEffect, useRef, useState } from 'react'
import { deviceLabel, type DeviceInfo } from '../lib/appLogic'
import { deviceStatus } from '../lib/overview'
import { Brand } from './Brand'
import { Icon } from './icons'

interface Props {
  devices: DeviceInfo[]
  selectedSerial: string | null
  onSelect: (serial: string) => void
  onDiagnose: () => void
  onCollect: () => void
}

function DeviceText({ d }: { d: DeviceInfo }) {
  const ready = d.state === 'device'
  return (
    <span className="aparelho-texto">
      <span className="aparelho-nome">{deviceLabel(d)}</span>
      {ready && (
        <span className="aparelho-detalhe mono">
          Android {d.android ?? '?'} · {d.serial}
        </span>
      )}
    </span>
  )
}

export function TopBar({ devices, selectedSerial, onSelect, onDiagnose, onCollect }: Props) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const selected = devices.find((d) => d.serial === selectedSerial) ?? null
  const status = deviceStatus(selected)

  // Fecha com Esc ou clique fora.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  return (
    <header className="topo">
      <Brand />
      <div className="topo-divisor" aria-hidden="true" />
      <div className="seletor" ref={box}>
        <button
          type="button"
          className="seletor-botao"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={devices.length === 0}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="Aparelho" size={20} />
          <span className={`ponto ponto-${status.tone}`} aria-hidden="true" />
          {selected ? <DeviceText d={selected} /> : <span className="aparelho-nome aparelho-vazio">Nenhum aparelho conectado</span>}
          {devices.length > 0 && <Icon name="chevron" size={16} />}
        </button>
        {open && (
          <ul className="seletor-lista" role="listbox" aria-label="Aparelhos">
            {devices.map((d) => {
              const isSel = d.serial === selectedSerial
              return (
                <li
                  key={d.serial}
                  role="option"
                  aria-selected={isSel}
                  className={`seletor-opcao${isSel ? ' selecionada' : ''}`}
                  onClick={() => {
                    onSelect(d.serial)
                    setOpen(false)
                  }}
                >
                  <span className={`ponto ponto-${deviceStatus(d).tone}`} aria-hidden="true" />
                  <DeviceText d={d} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <span className="topo-espaco" />
      <div className="topo-acoes">
        <button type="button" className="btn" onClick={onDiagnose}>
          <Icon name="pulso" size={16} />
          Diagnosticar conexão
        </button>
        <button type="button" className="btn btn-primario" onClick={onCollect}>
          <Icon name="camadas" size={16} />
          Coletar diagnóstico
        </button>
      </div>
    </header>
  )
}
