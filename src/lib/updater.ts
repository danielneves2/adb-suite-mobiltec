// Atualização automática: contrato com o plugin updater do Tauri (injetável nos testes).
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'

export interface DownloadProgress {
  downloaded: number
  /** null quando o servidor não informa o tamanho. */
  total: number | null
}

export interface AvailableUpdate {
  version: string
  notes: string | null
  /** Baixa e instala (no Windows o instalador fecha o app). */
  install(onProgress: (p: DownloadProgress) => void): Promise<void>
}

export interface UpdaterApi {
  check(): Promise<AvailableUpdate | null>
  relaunch(): Promise<void>
}

/** % inteiro de 0 a 100; null se o tamanho total é desconhecido. */
export function progressPercent(downloaded: number, total: number | null): number | null {
  if (!total) return null
  return Math.min(100, Math.floor((downloaded / total) * 100))
}

export const tauriUpdater: UpdaterApi = {
  async check() {
    const update = await check()
    if (!update) return null
    return {
      version: update.version,
      notes: update.body ?? null,
      async install(onProgress) {
        let downloaded = 0
        let total: number | null = null
        await update.downloadAndInstall((event) => {
          if (event.event === 'Started') total = event.data.contentLength ?? null
          else if (event.event === 'Progress') downloaded += event.data.chunkLength
          onProgress({ downloaded, total })
        })
      },
    }
  },
  relaunch,
}
