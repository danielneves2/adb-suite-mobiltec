// Visão geral do aparelho e log de atividade da sessão. Sem I/O.
import { deviceName, type DeviceInfo } from './appLogic'

export type Transport = 'USB' | 'Wi-Fi'

/** Wi-Fi quando o serial é `IP:porta` (adb connect) ou um serial mDNS de depuração sem fio. */
export function transportOf(serial: string): Transport {
  return /^[\d.]+:\d+$/.test(serial) || serial.includes('._adb-tls-connect') ? 'Wi-Fi' : 'USB'
}

export type StatusTone = 'ok' | 'alerta' | 'erro' | 'vazio'

export function deviceStatus(d: DeviceInfo | null): { tone: StatusTone; label: string } {
  if (!d) return { tone: 'vazio', label: 'Sem aparelho' }
  if (d.state === 'device') return { tone: 'ok', label: 'Conectado' }
  if (d.state === 'unauthorized') return { tone: 'alerta', label: 'Não autorizado' }
  if (d.state === 'offline') return { tone: 'erro', label: 'Offline' }
  return { tone: 'erro', label: d.state }
}

export interface ActivityEntry {
  at: Date
  tag: 'ADB' | 'CMD' | 'ERRO'
  text: string
}

/** O que mudou entre duas leituras de `adb devices`. */
export function deviceEvents(prev: DeviceInfo[], next: DeviceInfo[], at: Date): ActivityEntry[] {
  const out: ActivityEntry[] = []
  const before = new Map(prev.map((d) => [d.serial, d]))
  for (const d of next) {
    const old = before.get(d.serial)
    if (old?.state === d.state) continue
    if (d.state === 'device') out.push({ at, tag: 'ADB', text: `Aparelho conectado: ${deviceName(d)} (${d.serial})` })
    else if (d.state === 'unauthorized') out.push({ at, tag: 'ADB', text: `Aparelho aguardando autorização: ${d.serial}` })
  }
  const now = new Set(next.map((d) => d.serial))
  for (const d of prev) if (!now.has(d.serial)) out.push({ at, tag: 'ADB', text: `Aparelho desconectado: ${d.serial}` })
  return out
}

/** Empilha os eventos (o último do array é o mais recente) com o mais recente primeiro, até `max`. */
export function pushActivity(list: ActivityEntry[], entries: ActivityEntry[], max = 50): ActivityEntry[] {
  return [...entries].reverse().concat(list).slice(0, max)
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatClock(at: Date): string {
  return `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`
}
