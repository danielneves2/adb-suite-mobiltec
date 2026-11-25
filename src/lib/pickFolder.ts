// Janela do Windows para escolher uma pasta (plugin-dialog). Devolve null se o técnico cancelar.
import { open } from '@tauri-apps/plugin-dialog'

export async function pickFolder(defaultPath?: string): Promise<string | null> {
  const chosen = await open({ directory: true, multiple: false, defaultPath, title: 'Escolha a pasta de saída' })
  return typeof chosen === 'string' ? chosen : null
}
