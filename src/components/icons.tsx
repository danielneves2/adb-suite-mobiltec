// Ícones de linha (stroke 1,7, cantos arredondados, sem fill), tamanho padrão 18 px.
import type { ReactNode } from 'react'

const Svg = ({ children, size = 18 }: { children: ReactNode; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)

export const StarIcon = ({ filled = false, size = 18 }: { filled?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
)

const glyphs: Record<string, ReactNode> = {
  // categorias (menu e lista)
  Fixados: <path d="M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5" />,
  Apps: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  Pacotes: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" />,
  Telas: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M3 9h18" />
    </>
  ),
  Controle: (
    <>
      <rect x="2" y="7" width="20" height="10" rx="3" />
      <path d="M7 10v4M5 12h4M15 11h.01M18 13h.01" />
    </>
  ),
  Logs: <path d="M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4" />,
  Captura: (
    <>
      <path d="M3 7h4l2-3h6l2 3h4v13H3z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  Aparelho: (
    <>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  Arquivos: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H10l2 2h7.5A1.5 1.5 0 0 1 21 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />,
  Conexão: <path d="M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" />,
  Meus: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  'Meus comandos': (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  // interface
  chevron: <path d="M6 9l6 6 6-6" />,
  pulso: <path d="M3 12h4l2-5 4 10 2-5h6" />,
  camadas: <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </>
  ),
  busca: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  copiar: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M5 15V5a1 1 0 0 1 1-1h9" />
    </>
  ),
  android: (
    <>
      <path d="M5 16a7 7 0 0 1 14 0v3H5z" />
      <path d="M8 6l1.5 3M16 6l-1.5 3M9.5 13h.01M14.5 13h.01" />
    </>
  ),
  serial: <path d="M4 6v12M7 6v12M10 6v12M14 6v12M17 6v12M20 6v12" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  usb: <path d="M12 3v15M12 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 13l-4-3V7M12 11l4-3V6M7 7h2M15 4h2v2h-2z" />,
  wifi: <path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01" />,
  ok: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
  alerta: <path d="M12 4l9 16H3zM12 10v4M12 17v.01" />,
  pasta: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H10l2 2h7.5A1.5 1.5 0 0 1 21 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />,
  abrir: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  mais: <path d="M12 5v14M5 12h14" />,
}

/** Ícone por nome: categorias do catálogo ou nomes de interface ('chevron', 'pulso', …). */
export function Icon({ name, size }: { name: string; size?: number }) {
  return <Svg size={size}>{glyphs[name] ?? glyphs.Apps}</Svg>
}

/** Compatibilidade: ícone do menu lateral. */
export const RailIcon = ({ name }: { name: string }) => <Icon name={name} />
