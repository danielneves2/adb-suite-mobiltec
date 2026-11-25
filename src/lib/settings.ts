// Configurações gerais do app (guardadas no plugin-store, neste computador).

export interface WindowSizeOption {
  id: string
  label: string
  detail: string
}

/** Tamanhos da janela: "livre" (redimensiona à vontade) ou fixo (trava o tamanho, centraliza). */
export const WINDOW_SIZES: WindowSizeOption[] = [
  { id: 'livre', label: 'Livre', detail: 'Redimensiona e maximiza à vontade' },
  { id: '1280x720', label: '1280 × 720', detail: 'Notebook pequeno' },
  { id: '1440x900', label: '1440 × 900', detail: 'Notebook' },
  { id: '1600x900', label: '1600 × 900', detail: 'Monitor médio' },
  { id: '1920x1080', label: '1920 × 1080', detail: 'Full HD' },
]

const MIN = { width: 960, height: 600 }

export function parseWindowSize(id: string): { width: number; height: number } | null {
  const m = /^(\d{3,4})x(\d{3,4})$/.exec(id)
  if (!m) return null
  const width = Number(m[1])
  const height = Number(m[2])
  if (width < MIN.width || height < MIN.height) return null
  return { width, height }
}

/** Altura aproximada da barra de título do Windows (o tamanho fixo é o da área interna). */
const TITLE_BAR = 40

/** Tamanhos que cabem na área útil da tela (em pixels lógicos, já sem a barra de tarefas). "livre" sempre cabe. */
export function fitWindowSizes(work: { width: number; height: number }): string[] {
  return WINDOW_SIZES.filter((o) => {
    const size = parseWindowSize(o.id)
    return !size || (size.width <= work.width && size.height + TITLE_BAR <= work.height)
  }).map((o) => o.id)
}
