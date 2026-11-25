// Janela do Windows para escolher uma pasta (plugin-dialog). Devolve null se o técnico cancelar.
import { open } from '@tauri-apps/plugin-dialog'

export async function pickFolder(defaultPath?: string): Promise<string | null> {
  const chosen = await open({ directory: true, multiple: false, defaultPath, title: 'Escolha a pasta de saída' })
  return typeof chosen === 'string' ? chosen : null
}

/** Janela do Windows para escolher um arquivo do computador (APK filtra .apk/.apex). */
export async function pickFile(kind: 'apk' | 'file'): Promise<string | null> {
  const chosen = await open({
    directory: false,
    multiple: false,
    title: kind === 'apk' ? 'Escolha o APK' : 'Escolha o arquivo',
    filters: kind === 'apk' ? [{ name: 'Aplicativo Android', extensions: ['apk', 'apex'] }] : undefined,
  })
  return typeof chosen === 'string' ? chosen : null
}
