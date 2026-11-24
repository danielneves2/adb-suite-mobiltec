// Configuração local (pasta de saída, fixados) no config.json do app via plugin-store.
import { load } from '@tauri-apps/plugin-store'
import type { ConfigStore } from '../state/useAppState'

const storePromise = load('config.json', { autoSave: true, defaults: {} })

export const tauriConfigStore: ConfigStore = {
  get: async <T,>(key: string) => (await storePromise).get<T>(key),
  set: async (key: string, value: unknown) => {
    await (await storePromise).set(key, value)
  },
}
