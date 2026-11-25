import { useCallback, useRef, useState } from 'react'
import type { DeviceInfo } from '../lib/appLogic'
import { deviceEvents, pushActivity, type ActivityEntry } from '../lib/overview'

/** Log da sessão ("Última atividade"): eventos de aparelho e resultado dos comandos. Só em memória. */
export function useActivity() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const lastDevices = useRef<DeviceInfo[]>([])

  const log = useCallback((tag: ActivityEntry['tag'], text: string) => {
    setEntries((list) => pushActivity(list, [{ at: new Date(), tag, text }]))
  }, [])

  const trackDevices = useCallback((list: DeviceInfo[]) => {
    const events = deviceEvents(lastDevices.current, list, new Date())
    lastDevices.current = list
    if (events.length) setEntries((current) => pushActivity(current, events))
  }, [])

  return { entries, log, trackDevices }
}
