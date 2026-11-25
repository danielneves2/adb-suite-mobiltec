// Aplica o tamanho da janela escolhido em Configurações (lado Tauri; sem teste unitário).
import { LogicalSize, getCurrentWindow } from '@tauri-apps/api/window'
import { parseWindowSize } from './settings'

export async function applyWindowSize(id: string): Promise<void> {
  const w = getCurrentWindow()
  const size = parseWindowSize(id)
  if (!size) {
    await w.setResizable(true)
    await w.setMaximizable(true)
    return
  }
  await w.unmaximize()
  await w.setResizable(true)
  await w.setSize(new LogicalSize(size.width, size.height))
  await w.center()
  await w.setResizable(false)
  await w.setMaximizable(false)
}
