// Aplica o tamanho da janela escolhido em Configurações (lado Tauri).
import { LogicalSize, currentMonitor, getCurrentWindow } from '@tauri-apps/api/window'
import { parseWindowSize } from './settings'

/** O pedaço da API de janela que o app usa (injetável nos testes). */
export interface WindowApi {
  unmaximize(): Promise<void>
  setResizable(v: boolean): Promise<void>
  setMaximizable(v: boolean): Promise<void>
  setSize(width: number, height: number): Promise<void>
  center(): Promise<void>
}

/**
 * Devolve `apply(id)`. As chamadas entram numa fila e cada passo confere se ainda é o pedido mais recente:
 * clicar rápido "1280×720" e depois "Livre" nunca termina com a janela travada.
 */
export function createWindowSizer(api: WindowApi) {
  let latest = 0
  let queue: Promise<void> = Promise.resolve()

  const run = async (ticket: number, id: string) => {
    const size = parseWindowSize(id)
    const steps: (() => Promise<void>)[] = size
      ? [
          () => api.unmaximize(),
          () => api.setResizable(true),
          () => api.setSize(size.width, size.height),
          () => api.center(),
          () => api.setResizable(false),
          () => api.setMaximizable(false),
        ]
      : [() => api.setResizable(true), () => api.setMaximizable(true)]
    for (const step of steps) {
      if (ticket !== latest) return // chegou um pedido mais novo: ele decide
      await step()
    }
  }

  return (id: string): Promise<void> => {
    const ticket = ++latest
    queue = queue.then(() => run(ticket, id)).catch(() => {})
    return queue
  }
}

const tauriWindow: WindowApi = {
  unmaximize: () => getCurrentWindow().unmaximize(),
  setResizable: (v) => getCurrentWindow().setResizable(v),
  setMaximizable: (v) => getCurrentWindow().setMaximizable(v),
  setSize: (w, h) => getCurrentWindow().setSize(new LogicalSize(w, h)),
  center: () => getCurrentWindow().center(),
}

export const applyWindowSize = createWindowSizer(tauriWindow)

/** Área útil do monitor atual em pixels lógicos (sem a barra de tarefas), ou null se não der pra saber. */
export async function workAreaSize(): Promise<{ width: number; height: number } | null> {
  const m = await currentMonitor()
  if (!m) return null
  return { width: m.workArea.size.width / m.scaleFactor, height: m.workArea.size.height / m.scaleFactor }
}
