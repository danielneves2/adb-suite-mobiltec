import { openPath } from '@tauri-apps/plugin-opener'
import { useEffect, useState } from 'react'
import rawCatalog from '../data/catalog.json'
import { CommandForm } from './components/CommandForm'
import { CommandList } from './components/CommandList'
import { CommandView } from './components/CommandView'
import { Rail } from './components/Rail'
import { StatusBar } from './components/StatusBar'
import { TopBar } from './components/TopBar'
import { adb } from './lib/adb'
import type { Catalog } from './lib/catalogTypes'
import { formatTimestamp } from './lib/commandBuilder'
import { EMPTY_FORM, FORM_CATEGORIES, MY_CATEGORY, commandToForm, formToCommand, type CommandFormData } from './lib/commandForm'
import { tauriConfigStore } from './lib/configStore'
import { useAppState } from './state/useAppState'
import { useRunner } from './state/useRunner'
import './styles/app.css'

const catalog = rawCatalog as unknown as Catalog

export default function App() {
  const runner = useRunner({ api: adb })
  // Formulário Novo/Editar comando aberto no lugar da área principal (key força recomeçar do zero).
  const [form, setForm] = useState<{ initial: CommandFormData; editingId: string | null; key: number } | null>(null)
  // Só a escolha do técnico volta a saída para "aguardando" (e para o que estiver rodando).
  // Se o aparelho some sozinho, a mensagem de erro fica na tela.
  const s = useAppState({ listDevices: adb.listDevices, store: tauriConfigStore, onUserSelect: () => {
      runner.reset()
      setForm(null)
    },
  })
  const [packages, setPackages] = useState<string[]>([])
  const device = s.selectedDevice
  const ready = device?.state === 'device'

  // Pacotes instalados do aparelho selecionado (autocomplete).
  useEffect(() => {
    setPackages([])
    if (!ready || !device) return
    let alive = true
    adb
      .listPackages(device.serial)
      .then((list) => alive && setPackages(list))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [device?.serial, ready])

  const openFolder = async (path: string | null) => {
    if (!path) return
    try {
      await openPath(path)
    } catch {
      s.flash('A pasta ainda não existe: ela é criada quando um comando salvar algo.')
    }
  }

  const saveOutput = async (text: string) => {
    if (!s.currentDeviceDir) return
    try {
      const saved = await adb.writeTextFile(`${s.currentDeviceDir}\\saida_${formatTimestamp(new Date())}.txt`, text)
      s.flash(`Saída salva em ${saved}`)
    } catch (e) {
      s.flash(String(e))
    }
  }

  const restartServer = async () => {
    try {
      await adb.restartAdbServer()
      s.flash('Servidor adb reiniciado.')
    } catch (e) {
      s.flash(String(e))
    }
  }

  const cmd = s.selectedCommand

  const openForm = (initial: Partial<CommandFormData>, editingId: string | null = null) => {
    const categoria = FORM_CATEGORIES.includes(s.rail) ? s.rail : MY_CATEGORY
    setForm({ initial: { ...EMPTY_FORM, categoria, ...initial }, editingId, key: Date.now() })
  }

  const saveForm = (f: CommandFormData) => {
    const id = form?.editingId ?? `local-${crypto.randomUUID()}`
    s.saveCommand(formToCommand(f, id, new Date()))
    setForm(null)
    s.flash('Comando salvo neste computador.')
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
        <Rail
          active={s.rail}
          searching={s.searching}
          onSelect={(key) => {
            s.setRail(key)
            if (key === 'Fixados') s.selectCommand(null) // "Início" volta para a visão geral
          }}
        />
        <CommandList
          title={s.listTitle}
          commands={s.listCommands}
          selectedId={s.selectedCommandId}
          showCategory={s.searching || s.rail === 'Fixados' || s.rail === 'Meus'}
          emptyText={s.emptyText}
          search={s.search}
          onSearch={s.setSearch}
          onSelect={s.selectCommand}
          onNew={() => openForm({})}
          pinned={s.pinned}
          onTogglePin={s.togglePin}
        />
        <main className="principal">
          {s.devicesError && (
            <div className="faixa" role="alert">
              <strong className="faixa-atencao">ADB</strong>
              <span className="faixa-texto">{s.devicesError}</span>
              <button type="button" className="btn btn-primario btn-faixa" onClick={() => void restartServer()}>
                Reiniciar servidor adb
              </button>
            </div>
          )}
          {form ? (
            <CommandForm
              key={form.key}
              initial={form.initial}
              editing={!!form.editingId}
              device={device}
              deviceDir={s.currentDeviceDir}
              onSave={saveForm}
              onCancel={() => setForm(null)}
            />
          ) : cmd ? (
            <CommandView
              command={cmd}
              device={device}
              deviceDir={s.currentDeviceDir}
              packages={packages}
              suggestedPackages={catalog.pacotes_sugeridos}
              pinned={s.pinned.includes(cmd.id)}
              onTogglePin={() => s.togglePin(cmd.id)}
              run={runner.view}
              onRun={(value, allowEmptyValue) => device && runner.start(cmd, { device, value, baseDir: s.baseDir, allowEmptyValue })}
              onRunFree={(input) => device && runner.startFree(input, { device, baseDir: s.baseDir })}
              onStop={() => void runner.stop()}
              onReset={runner.reset}
              onOpenFolder={() => void openFolder(s.currentDeviceDir)}
              onSaveOutput={(text) => void saveOutput(text)}
              onRestartServer={() => void restartServer()}
              flash={s.flash}
              onEdit={() => openForm(commandToForm(cmd), cmd.id)}
              onDelete={() => {
                s.deleteCommand(cmd.id)
                s.flash('Comando excluído.')
              }}
              onSaveAsCommand={(comando) => openForm({ comando, categoria: MY_CATEGORY })}
            />
          ) : (
            <p className="lista-vazia">Escolha um comando na lista.</p>
          )}
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
