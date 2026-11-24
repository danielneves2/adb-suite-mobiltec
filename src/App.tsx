import { openPath } from '@tauri-apps/plugin-opener'
import { CommandList } from './components/CommandList'
import { Rail } from './components/Rail'
import { StatusBar } from './components/StatusBar'
import { TopBar } from './components/TopBar'
import { adb } from './lib/adb'
import { tauriConfigStore } from './lib/configStore'
import { useAppState } from './state/useAppState'
import './styles/app.css'

export default function App() {
  const s = useAppState({ listDevices: adb.listDevices, store: tauriConfigStore })

  const openFolder = async (path: string | null) => {
    if (!path) return
    try {
      await openPath(path)
    } catch {
      s.flash('A pasta ainda não existe: ela é criada quando um comando salvar algo.')
    }
  }

  return (
    <div className="app">
      <TopBar
        devices={s.devices}
        selectedSerial={s.selectedSerial}
        onSelect={s.selectSerial}
        onDiagnose={() => s.selectCommand('conexao')}
        onCollect={() => s.selectCommand('diag')}
      />
      <div className="app-corpo">
        <Rail active={s.rail} searching={s.searching} onSelect={s.setRail} />
        <CommandList
          title={s.listTitle}
          commands={s.listCommands}
          selectedId={s.selectedCommandId}
          showCategory={s.searching || s.rail === 'Fixados'}
          emptyText={s.emptyText}
          search={s.search}
          onSearch={s.setSearch}
          onSelect={s.selectCommand}
        />
        <main className="principal">
          {s.devicesError && <p className="status-mensagem">{s.devicesError}</p>}
          {s.selectedCommand ? <h1>{s.selectedCommand.nome}</h1> : <p className="lista-vazia">Escolha um comando na lista.</p>}
        </main>
      </div>
      <StatusBar
        deviceDir={s.currentDeviceDir}
        baseDir={s.baseDir}
        onChangeBase={(dir) => {
          s.setBaseDir(dir)
          s.flash('Pasta de saída alterada. Cada aparelho ganha uma subpasta própria.')
        }}
        onOpen={() => void openFolder(s.currentDeviceDir ?? s.baseDir)}
        message={s.status}
        deviceCount={s.devices.filter((d) => d.state === 'device').length}
      />
    </div>
  )
}
