// Ícones em linha reta (stroke 1,8, linecap square, linejoin miter, sem fill) — referência de UI §2.
import type { ReactNode } from 'react'

const Svg = ({ children, size = 18 }: { children: ReactNode; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="square"
    strokeLinejoin="miter"
    aria-hidden="true"
  >
    {children}
  </svg>
)

export const StarIcon = ({ filled = false, size = 18 }: { filled?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="miter" aria-hidden="true">
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
  </svg>
)

const glyphs: Record<string, ReactNode> = {
  Apps: (
    <>
      <rect x="4" y="4" width="6" height="6" />
      <rect x="14" y="4" width="6" height="6" />
      <rect x="4" y="14" width="6" height="6" />
      <rect x="14" y="14" width="6" height="6" />
    </>
  ),
  Pacotes: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" />,
  Telas: (
    <>
      <rect x="3" y="5" width="18" height="14" />
      <path d="M3 9h18" />
    </>
  ),
  Controle: (
    <>
      <rect x="2" y="7" width="20" height="10" />
      <path d="M7 10v4M5 12h4" />
      <path d="M15 11h.01M18 13h.01" />
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
      <rect x="7" y="2" width="10" height="20" />
      <path d="M11 18h2" />
    </>
  ),
  Arquivos: <path d="M3 6h7l2 2h9v12H3z" />,
  Conexão: <path d="M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" />,
  Meus: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
}

export function RailIcon({ name }: { name: string }) {
  if (name === 'Fixados') return <StarIcon />
  return <Svg>{glyphs[name]}</Svg>
}
