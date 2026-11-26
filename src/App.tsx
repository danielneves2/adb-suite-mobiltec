import { getVersion } from '@tauri-apps/api/app'
import { openPath } from '@tauri-apps/plugin-opener'
import { useCallback, useEffect, useRef, useState } from 'react'
import rawCatalog from '../data/catalog.json'
import { CommandForm } from './components/CommandForm'
import { CommandList } from './components/CommandList'
import { CommandView } from './components/CommandView'
import { DeviceOverview } from './components/DeviceOverview'
import { FreeCommandView } from './components/FreeCommandView'
import { Rail } from './components/Rail'
import { Settings, type TeamUsersState } from './components/Settings'
import { StatusBar } from './components/StatusBar'
import { TopBar } from './components/TopBar'
import { Welcome } from './components/Welcome'
import { adb, type PackageKind } from './lib/adb'
import type { Catalog } from './lib/catalogTypes'
import { formatTimestamp } from './lib/commandBuilder'
import { EMPTY_FORM, FORM_CATEGORIES, MY_CATEGORY, commandToForm, formToCommand, type CommandFormData } from './lib/commandForm'
import { tauriConfigStore } from './lib/configStore'
import { pickFile, pickFolder } from './lib/pickFolder'
import { fitWindowSizes, initialWindowSize } from './lib/settings'
import { teamApiFromEnv } from './lib/teamApi'
import { tauriUpdater } from './lib/updater'
import { applyWindowSize, fitWindow, workAreaSize } from './lib/window'
import { useActivity } from './state/useActivity'
import { useRunLog } from './state/useRunLog'
import { useAppState } from './state/useAppState'
import { useRunner } from './state/useRunner'
import { useUpdater } from './state/useUpdater'
import './styles/app.css'

const catalog = rawCatalog as unknown as Catalog
// Servidor do time (VITE_API_URL + VITE_APP_KEY no build). Sem ele, os comandos criados ficam neste PC.
const teamApi = teamApiFromEnv()
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export default function App() {
  const runner = useRunner({ api: adb })
  // Procura versão nova ao abrir (em silêncio se não tiver internet ou release).
  const updater = useUpdater(tauriUpdater, { autoCheck: true, installOnStart: true, recheckMs: 60 * 60 * 1000 })
  // Atualizar fecha o app: não deixa no meio de um comando rodando.
  const updateBlocked = runner.view.phase === 'running'
  // Formulário Novo/Editar comando aberto no lugar da área principal (key força recomeçar do zero).
  // Telas que não são um comando do catálogo: Configurações e Comando livre.
  const [screen, setScreen] = useState<'config' | 'livre' | null>(null)
  const [adbVersion, setAdbVersion] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [availableSizes, setAvailableSizes] = useState<string[] | undefined>(undefined)
  const [form, setForm] = useState<{ initial: CommandFormData; editingId: string | null; key: number } | null>(null)
  // Só a escolha do técnico volta a saída para "aguardando" (e para o que estiver rodando).
  // Se o aparelho some sozinho, a mensagem de erro fica na tela.
  const s = useAppState({ listDevices: adb.listDevices, store: tauriConfigStore, teamApi, onUserSelect: (kind) => {
      runner.reset() // a saída era de outro comando/aparelho (e para o que estiver rodando)
      // Trocar de aparelho mantém a tela atual (Comando livre, Configurações, formulário) e só muda o alvo.
      if (kind === 'command') {
        setForm(null)
        setScreen(null)
      }
    },
  })
  const [packages, setPackages] = useState<string[]>([])

  // Sair do Comando livre (por qualquer caminho) para o que ele rodava: a saída dele é só dele.
  const previousScreen = useRef(screen)
  useEffect(() => {
    if (previousScreen.current === 'livre' && screen !== 'livre') runner.reset()
    previousScreen.current = screen
  }, [screen, runner.reset])
  const activity = useActivity()

  // Versões do app e do adb embutido (tela Configurações → Sobre).
  useEffect(() => {
    getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion(null))
    adb
      .adbVersion()
      .then(setAdbVersion)
      .catch(() => setAdbVersion(null))
  }, [])

  // Técnicos do time (lido ao abrir Configurações; sem servidor, a seção não aparece).
  const [teamUsers, setTeamUsers] = useState<TeamUsersState | undefined>(undefined)
  useEffect(() => {
    if (screen !== 'config' || !teamApi) return
    let alive = true
    setTeamUsers({ kind: 'loading' })
    teamApi
      .users()
      .then((names) => alive && setTeamUsers({ kind: 'ok', names }))
      .catch(() => alive && setTeamUsers({ kind: 'error' }))
    return () => {
      alive = false
    }
  }, [screen])

  // Tamanhos que cabem nesta tela (lido ao abrir Configurações: o monitor pode ter mudado).
  useEffect(() => {
    if (screen !== 'config') return
    workAreaSize()
      .then((work) => setAvailableSizes(work ? fitWindowSizes(work) : undefined))
      .catch(() => setAvailableSizes(undefined))
  }, [screen])

  // Tamanho da janela escolhido em Configurações (vale também ao abrir o app).
  // Um tamanho salvo que não cabe mais nesta tela (outro monitor, escala maior) volta para "livre".
  // Na primeira vez em "livre", se a janela de abertura não cabe (notebook com zoom), encolhe até caber.
  const fittedAtStart = useRef(false)
  useEffect(() => {
    void (async () => {
      let id = s.windowSize
      let work: { width: number; height: number } | null = null
      try {
        work = await workAreaSize()
        if (work && !fitWindowSizes(work).includes(id)) id = 'livre'
      } catch {
        // sem informação do monitor: aplica o que foi escolhido
      }
      await applyWindowSize(id)
      if (id === 'livre' && work && !fittedAtStart.current) {
        fittedAtStart.current = true
        const fit = initialWindowSize(work)
        if (fit) await fitWindow(fit.width, fit.height).catch(() => {})
      }
    })()
  }, [s.windowSize])
  // Nome do que está rodando, pro log de atividade ("Comando livre" ou o nome do comando).
  const runName = useRef('')

  // Log de atividade: entrada/saída de aparelhos.
  useEffect(() => {
    activity.trackDevices(s.devices)
  }, [s.devices, activity.trackDevices])

  // Log de atividade: resultado de cada execução (uma vez por execução).
  useRunLog(runner.view, runName.current, activity.log)
  const device = s.selectedDevice
  const ready = device?.state === 'device'

  // Pacotes instalados do aparelho selecionado (autocomplete).
  useEffect(() => {
    setPackages([])
    if (!ready || !device) return
    let alive = true
    adb
      .listPackages(device.serial, 'all')
      .then((list) => alive && setPackages(list))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [device?.serial, ready])

  // Painel "Ver apps do aparelho": lista por tipo, sempre do aparelho selecionado agora.
  const serial = device?.serial
  const loadPackages = useCallback((kind: PackageKind) => (serial ? adb.listPackages(serial, kind) : Promise.resolve([])), [serial])

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
    const categoria = FORM_CATEGORIES.includes(s.rail) || s.customCategories.includes(s.rail) ? s.rail : MY_CATEGORY
    setScreen(null)
    setForm({ initial: { ...EMPTY_FORM, categoria, ...initial }, editingId, key: Date.now() })
  }

  // Comandos vão pro time (com servidor) ou ficam neste PC (sem servidor no build).
  const shared = s.syncStatus !== 'local'

  // Se não salvar (sem conexão), o erro aparece no formulário e ele continua aberto.
  const saveForm = async (f: CommandFormData) => {
    const id = form?.editingId ?? `local-${crypto.randomUUID()}`
    await s.saveCommand(formToCommand(f, id, new Date(), s.userName))
    setForm(null)
    s.flash(shared ? 'Comando salvo pro time.' : 'Comando salvo neste computador.')
  }

  const deleteCommand = (id: string) =>
    s.deleteCommand(id).then(
      () => s.flash('Comando excluído.'),
      (e) => s.flash(`Não excluiu: ${errorText(e)}`),
    )

  return (
    <div className="app">
      {s.userReady && !s.userName && (
        <Welcome
          knownUsers={s.knownUsers}
          onForget={s.forgetUser}
          onEnter={(name) => {
            void s.setUserName(name)
            activity.log('ADB', `Bem-vindo, ${name}.`)
          }}
        />
      )}
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
          settingsActive={screen === 'config'}
          onSettings={() => {
            setForm(null)
            setScreen('config')
          }}
          userName={s.userName}
          extraCategories={s.customCategories}
          onProfile={() => {
            setForm(null)
            setScreen('config')
          }}
          freeActive={screen === 'livre'}
          onFree={() => {
            if (screen === 'livre') return
            runner.reset() // a saída da tela livre é só dela (e para o que estiver rodando, como qualquer troca)
            setForm(null)
            setScreen('livre')
          }}
          onSelect={(key) => {
            setScreen(null)
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
          onEdit={(id) => {
            const c = s.commands.find((x) => x.id === id)
            if (c) openForm(commandToForm(c), c.id)
          }}
          onDelete={(id) => void deleteCommand(id)}
          categoryActions={
            s.customCategories.includes(s.rail) && !s.searching
              ? {
                  name: s.rail,
                  onRename: (to) => {
                    s.renameCategory(s.rail, to).then(
                      () => s.flash(`Categoria renomeada para ${to}.`),
                      (e) => s.flash(`Não renomeou: ${errorText(e)}`),
                    )
                  },
                  onDelete: () => {
                    s.deleteCategory(s.rail).then(
                      () => s.flash('Categoria excluída. Os comandos dela foram para Meus comandos.'),
                      (e) => s.flash(`Não excluiu a categoria: ${errorText(e)}`),
                    )
                  },
                }
              : undefined
          }
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
          {screen === 'config' ? (
            <Settings
              windowSize={s.windowSize}
              onWindowSize={(id) => {
                s.setWindowSize(id)
                s.flash(id === 'livre' ? 'Janela livre: dá pra redimensionar.' : 'Tamanho da janela fixado.')
              }}
              baseDir={s.baseDir}
              onChangeBase={(dir) => {
                s.setBaseDir(dir)
                s.flash('Pasta de saída alterada. Cada aparelho ganha uma subpasta própria.')
              }}
              onOpenBase={() => void openFolder(s.baseDir)}
              adbVersion={adbVersion}
              appVersion={appVersion}
              update={updater.state}
              onCheckUpdate={() => void updater.check()}
              onInstallUpdate={() => void updater.install()}
              updateBlocked={updateBlocked}
              onClose={() => setScreen(null)}
              availableSizes={availableSizes}
              teamUsers={teamUsers}
              pickFolder={pickFolder}
              userName={s.userName}
              onUserName={(name) => {
                // Trocar de usuário: nada da tela anterior (formulário aberto, Configurações) passa pro próximo perfil.
                setForm(null)
                setScreen(null)
                void s.setUserName(name)
                s.flash(name ? `Pronto, ${name}.` : 'Escolha o usuário pra entrar.')
              }}
            />
          ) : screen === 'livre' ? (
            <FreeCommandView
              device={device}
              run={runner.view}
              onRunFree={(input) => {
                if (!device) return
                runName.current = 'Comando livre'
                runner.startFree(input, { device, baseDir: s.baseDir })
              }}
              onStop={() => void runner.stop()}
              onSaveAsCommand={(comando) => openForm({ comando, categoria: MY_CATEGORY })}
              onOpenFolder={() => void openFolder(s.currentDeviceDir)}
              onSaveOutput={(text) => void saveOutput(text)}
              onRestartServer={() => void restartServer()}
              flash={s.flash}
            />
          ) : form ? (
            <CommandForm
              key={form.key}
              initial={form.initial}
              editing={!!form.editingId}
              device={device}
              deviceDir={s.currentDeviceDir}
              onSave={saveForm}
              onCancel={() => setForm(null)}
              customCategories={s.customCategories}
              shared={shared}
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
              onRun={(value, allowEmptyValue) => {
                if (!device) return
                runName.current = cmd.nome
                runner.start(cmd, { device, value, baseDir: s.baseDir, allowEmptyValue })
              }}
              onStop={() => void runner.stop()}
              onReset={runner.reset}
              onOpenFolder={() => void openFolder(s.currentDeviceDir)}
              onSaveOutput={(text) => void saveOutput(text)}
              onRestartServer={() => void restartServer()}
              flash={s.flash}
              onEdit={() => openForm(commandToForm(cmd), cmd.id)}
              onDelete={() => void deleteCommand(cmd.id)}
              loadPackages={loadPackages}
              pickFile={pickFile}
              shared={shared}
            />
          ) : (
            <DeviceOverview
              device={device}
              entries={activity.entries}
              onDiagnose={() => s.selectCommand('conexao')}
              onCollect={() => s.selectCommand('diag')}
              onInfo={() => s.selectCommand('info')}
              onOpenFolder={() => void openFolder(s.currentDeviceDir ?? s.baseDir)}
              flash={s.flash}
            />
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
        device={device}
        adbOk={!s.devicesError}
        pickFolder={pickFolder}
        update={updater.state}
        onInstallUpdate={() => void updater.install()}
        updateBlocked={updateBlocked}
        syncStatus={s.syncStatus}
      />
    </div>
  )
}
