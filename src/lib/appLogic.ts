// Lógica pura da interface (sem React, sem Tauri). Textos exatos da referência de UI.
import type { Command } from './catalogTypes'

export interface DeviceInfo {
  serial: string
  /** `device` = pronto; `unauthorized`, `offline`… */
  state: string
  brand?: string
  model?: string
  android?: string
}

export const DEFAULT_PACKAGE = 'br.com.mobiltec.c4m.android.agent'
export const DEFAULT_OUTPUT_DIR = 'C:\\ADB-Suite\\Saidas'

/** Barra de ícones, na ordem do protótipo. `key` = categoria do catálogo, 'Fixados' ou 'Meus'. */
export const RAIL: readonly { key: string; label: string; title: string }[] = [
  { key: 'Fixados', label: 'Fixados', title: 'Fixados' },
  { key: 'Apps', label: 'Apps', title: 'Apps' },
  { key: 'Pacotes', label: 'Pacotes', title: 'Pacotes' },
  { key: 'Telas', label: 'Telas', title: 'Telas' },
  { key: 'Controle', label: 'Controle', title: 'Controle' },
  { key: 'Logs', label: 'Logs', title: 'Logs' },
  { key: 'Captura', label: 'Captura', title: 'Captura' },
  { key: 'Aparelho', label: 'Aparelho', title: 'Aparelho' },
  { key: 'Arquivos', label: 'Arquivos', title: 'Arquivos' },
  { key: 'Conexão', label: 'Conexão', title: 'Conexão' },
  { key: 'Meus', label: 'Meus', title: 'Meus comandos' },
]

const INVALID_PATH_CHARS = /[<>:"/\\|?*]/g

const part = (s: string) => s.trim().replace(/\s+/g, '-').replace(INVALID_PATH_CHARS, '_')

/** `<Marca>-<Modelo com espaços→hífen>_<SERIAL>`, seguro como nome de pasta no Windows. */
export function deviceFolderName(d: DeviceInfo): string {
  const name = [d.brand, d.model].filter((x): x is string => !!x && x.trim() !== '').map(part).join('-')
  const serial = part(d.serial)
  return name ? `${name}_${serial}` : serial
}

export function deviceDir(base: string, d: DeviceInfo): string {
  return `${base.replace(/[\\/]+$/, '')}\\${deviceFolderName(d)}`
}

const isOfficial = (c: Command) => c.oficial !== false

export function filterCommands(cmds: Command[], o: { search: string; rail: string; pinned: string[] }): Command[] {
  const visible = cmds.filter((c) => !c.excluido)
  const q = o.search.trim().toLowerCase()
  if (q) {
    return visible.filter((c) => [c.nome, c.comando, c.resumo].some((t) => t.toLowerCase().includes(q)))
  }
  if (o.rail === 'Fixados') {
    return o.pinned.map((id) => visible.find((c) => c.id === id)).filter((c): c is Command => !!c)
  }
  if (o.rail === 'Meus') return visible.filter((c) => !isOfficial(c))
  return visible.filter((c) => c.categoria === o.rail)
}

export function togglePinned(pinned: string[], id: string): string[] {
  return pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id]
}

export function initialValue(c: Command): string {
  if (c.atalhos && c.atalhos.length > 0) return c.atalhos[0].valor
  if (c.parametro === 'pkg') return DEFAULT_PACKAGE
  return ''
}

export const deviceName = (d: DeviceInfo) => [d.brand, d.model].filter(Boolean).join(' ') || d.serial

export function confirmationText(c: Command, value: string, d: DeviceInfo): string {
  const action = c.texto_confirmacao ? c.texto_confirmacao.replace(/\{p\}/g, value) : `rodar “${c.nome}”`
  return `Você vai ${action} no ${deviceName(d)} (${d.serial}). Isso pode não ter volta.`
}

const pad = (n: number) => String(n).padStart(2, '0')

/** `DD/MM/AAAA HH:MM` (24 h). */
export function formatDateTime(at: Date): string {
  return `${pad(at.getDate())}/${pad(at.getMonth() + 1)}/${at.getFullYear()} ${pad(at.getHours())}:${pad(at.getMinutes())}`
}

export function metaLine(d: DeviceInfo, at: Date): string {
  return `# ${deviceName(d)} · Android ${d.android ?? '?'} · serial ${d.serial} · ${formatDateTime(at)}`
}

export function ticketText(d: DeviceInfo, display: string, output: string, at: Date): string {
  return [
    `Aparelho: ${deviceName(d)} (Android ${d.android ?? '?'})`,
    `Serial: ${d.serial}`,
    `Data: ${formatDateTime(at)}`,
    `Comando: ${display}`,
    '-'.repeat(40),
    output,
  ].join('\n')
}

export function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`
}

export function deviceLabel(d: DeviceInfo): string {
  if (d.state === 'unauthorized') return `${d.serial} · não autorizado — confirme a depuração no aparelho`
  if (d.state !== 'device') return `${d.serial} · ${d.state}`
  return deviceName(d)
}
