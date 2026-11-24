import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useState } from 'react'

export default function App() {
  const [version, setVersion] = useState('verificando adb…')

  useEffect(() => {
    invoke<string>('adb_version')
      .then((v) => {
        setVersion(v)
        void getCurrentWindow().setTitle(`ADB Suite – Mobiltec · ${v}`)
      })
      .catch((e) => setVersion(String(e)))
  }, [])

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20 }}>ADB SUITE - MOBILTEC</h1>
      <p className="terminal" style={{ color: 'var(--laranja)', fontSize: 19 }}>
        $ {version} █
      </p>
    </main>
  )
}
