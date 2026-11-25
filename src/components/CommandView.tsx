import { useEffect, useMemo, useState } from 'react'
import type { PackageKind } from '../lib/adb'
import { confirmationText, deviceName, initialValue, type DeviceInfo } from '../lib/appLogic'
import type { Command, ParamKind } from '../lib/catalogTypes'
import { buildCommand } from '../lib/commandBuilder'
import { suggestedInstalled } from '../lib/packages'
import { PackagePicker } from './PackagePicker'
import type { RunView } from '../state/useRunner'
import { Icon, StarIcon } from './icons'
import { OutputPanel } from './OutputPanel'
import { useCopied } from './useCopied'

export interface CommandViewProps {
  command: Command
  device: DeviceInfo | null
  deviceDir: string | null
  packages: string[]
  suggestedPackages: string[]
  pinned: boolean
  onTogglePin: () => void
  run: RunView
  onRun: (value: string, allowEmpty: boolean) => void
  onStop: () => void
  onReset: () => void
  onOpenFolder: () => void
  onSaveOutput: (text: string) => void
  onRestartServer: () => void
  flash: (msg: string) => void
  onEdit: () => void
  onDelete: () => void
  /** Lista os apps do aparelho selecionado (painel "Ver apps do aparelho"). */
  loadPackages: (kind: PackageKind) => Promise<string[]>
}

const DEFAULT_LABEL: Record<ParamKind, string> = {
  pkg: 'Pacote do app',
  apk: 'Arquivo APK no computador',
  file: 'Arquivo no computador',
  path: 'Caminho do arquivo no aparelho',
  text: 'Valor',
}

const DEFAULT_PLACEHOLDER: Record<ParamKind, string> = {
  pkg: 'br.com.mobiltec.c4m.android.agent',
  apk: 'C:\\adb\\c4magent.apk',
  file: 'C:\\adb\\arquivo.txt',
  path: '/sdcard/Download/arquivo.txt',
  text: 'digite o valor',
}

export function CommandView(p: CommandViewProps) {
  const { command: c, device } = p
  const [value, setValue] = useState(() => initialValue(c))
  const [otherMode, setOtherMode] = useState(false)
  const [fromShortcut, setFromShortcut] = useState(() => !!c.atalhos?.length)
  const [confirming, setConfirming] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [picking, setPicking] = useState(false)
  const [showCommand, setShowCommand] = useState(true)
  const copyCmd = useCopied()

  // Trocar de comando ou de aparelho volta tudo ao padrão.
  useEffect(() => {
    setValue(initialValue(c))
    setOtherMode(false)
    setFromShortcut(!!c.atalhos?.length)
    setConfirming(false)
    setConfirmingDelete(false)
    setPicking(false)
  }, [c, device?.serial])

  const ready = !!device && device.state === 'device'
  const running = p.run.phase === 'running'
  const hasChoice = !!c.escolha && !!c.atalhos?.length
  const label = c.rotulo_parametro ?? (c.parametro ? DEFAULT_LABEL[c.parametro] : '')
  const placeholder = c.exemplo ?? (c.parametro ? DEFAULT_PLACEHOLDER[c.parametro] : '')
  const allowEmpty = fromShortcut && value === ''

  const preview = useMemo(() => {
    if (!device) return c.comando
    try {
      return buildCommand(c.comando, { serial: device.serial, value, deviceDir: p.deviceDir ?? '{d}', now: new Date() }, { allowEmptyValue: true }).display
    } catch {
      return c.comando
    }
  }, [c, device, value, p.deviceDir])

  const changeValue = (v: string, viaShortcut: boolean) => {
    setValue(v)
    setFromShortcut(viaShortcut)
    setConfirming(false)
    if (!running) p.onReset() // não apaga a saída de algo que ainda está rodando
  }

  const execute = () => {
    if (c.pede_confirmacao) setConfirming(true)
    else p.onRun(value, allowEmpty)
  }

  const chips =
    !hasChoice && c.parametro
      ? c.atalhos?.length
        ? c.atalhos
        : c.parametro === 'pkg'
          ? suggestedInstalled(p.suggestedPackages, p.packages).map((x) => ({ rotulo: x, valor: x }))
          : []
      : []
  const chipsLabel = c.atalhos?.length ? 'Atalhos:' : 'Sugeridos neste aparelho:'
  const pickPackages = c.parametro === 'pkg' && (!hasChoice || otherMode)

  return (
    <div className="comando">
      <div className="comando-topo">
        <span className="rotulo">{c.categoria} /</span>
        <button type="button" className="btn-fixar" aria-pressed={p.pinned} onClick={p.onTogglePin}>
          <span className={p.pinned ? 'estrela cheia' : 'estrela'}>
            <StarIcon size={12} filled={p.pinned} />
          </span>
          {p.pinned ? 'Fixado' : 'Fixar'}
        </button>
        {c.pede_confirmacao && <span className="selo">PEDE CONFIRMAÇÃO</span>}
        {c.oficial === false && (
          <>
            <span className="selo selo-local">{c.autor ? `POR ${c.autor.toUpperCase()} · SÓ NESTE PC` : 'SEU · SÓ NESTE PC'}</span>
            <button type="button" className="btn btn-mini" onClick={p.onEdit}>
              Editar
            </button>
            <button type="button" className="btn btn-mini" onClick={() => setConfirmingDelete(true)}>
              Excluir
            </button>
          </>
        )}
      </div>
      {confirmingDelete && (
        <div className="faixa" role="alertdialog" aria-label="Confirmar exclusão">
          <strong className="faixa-atencao">EXCLUIR</strong>
          <span className="faixa-texto">Excluir o comando “{c.nome}”? Ele some da lista e dos fixados.</span>
          <button type="button" className="btn btn-faixa" onClick={() => setConfirmingDelete(false)}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primario btn-faixa" onClick={() => {
            setConfirmingDelete(false)
            p.onDelete()
          }}>
            Sim, excluir
          </button>
        </div>
      )}
      <h1 className="comando-nome">{c.nome}</h1>
      <p className="comando-resumo">{c.resumo}</p>

      {c.parametro && hasChoice && (
        <fieldset className="opcoes">
          <legend className="rotulo">{c.escolha!.pergunta}</legend>
          {c.atalhos!.map((a) => {
            const selected = !otherMode && value === a.valor
            return (
              <button key={a.rotulo} type="button" className={`opcao${selected ? ' selecionada' : ''}`} aria-pressed={selected} onClick={() => {
                setOtherMode(false)
                changeValue(a.valor, true)
              }}>
                <span className={`marcador${selected ? ' cheio' : ''}`} aria-hidden="true" />
                <span>
                  <strong>{a.rotulo}</strong>
                  {a.valor && <span className="opcao-valor"> {a.valor}</span>}
                </span>
              </button>
            )
          })}
          <button type="button" className={`opcao${otherMode ? ' selecionada' : ''}`} aria-pressed={otherMode} onClick={() => {
            setOtherMode(true)
            changeValue('', false)
          }}>
            <span className={`marcador${otherMode ? ' cheio' : ''}`} aria-hidden="true" />
            <strong>{c.escolha!.opcao_outro ?? 'Outro…'}</strong>
          </button>
        </fieldset>
      )}

      {c.parametro && (!hasChoice || otherMode) && (
        <div className="campo-linha">
          <label className="rotulo" htmlFor="valor">
            {label}
          </label>
          <input
            id="valor"
            className="campo"
            value={value}
            placeholder={placeholder}
            list={c.parametro === 'pkg' ? 'pacotes-instalados' : undefined}
            onChange={(e) => changeValue(e.target.value, false)}
            spellCheck={false}
            autoComplete="off"
          />
          {pickPackages && (
            <button type="button" className="btn btn-apps" disabled={!ready} aria-expanded={picking} onClick={() => setPicking((v) => !v)}>
              <Icon name="Apps" size={15} />
              Ver apps do aparelho
            </button>
          )}
          {c.parametro === 'pkg' && (
            <datalist id="pacotes-instalados">
              {p.packages.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          )}
        </div>
      )}

      {picking && device && ready && (
        <PackagePicker
          key={device.serial}
          serial={device.serial}
          deviceName={deviceName(device)}
          selected={value}
          load={p.loadPackages}
          onPick={(pkg) => {
            changeValue(pkg, false)
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}

      <div className="acoes">
        {running ? (
          <button type="button" className="btn btn-primario btn-executar" onClick={p.onStop}>
            ■ Parar
          </button>
        ) : (
          <button type="button" className="btn btn-primario btn-executar" disabled={!ready} onClick={execute}>
            ▶ Executar no {device?.model ?? 'aparelho'}
          </button>
        )}
        {!ready && <span className="aviso">Conecte um aparelho</span>}
        <button type="button" className="btn btn-ver" onClick={() => setShowCommand((v) => !v)}>
          {showCommand ? 'Esconder comando adb' : 'Ver comando adb'}
        </button>
      </div>

      {chips.length > 0 && (
        <div className="chips">
          <span className="rotulo">{chipsLabel}</span>
          {chips.map((a) => (
            <button key={a.rotulo} type="button" className="chip" onClick={() => changeValue(a.valor, true)}>
              {a.rotulo}
            </button>
          ))}
        </div>
      )}

      {showCommand && (
        <div className="caixa-comando">
          <code className="terminal">{preview.split('\n').map((l) => `$ ${l}`).join('\n')}</code>
          <button type="button" className="btn-copiar" onClick={() => void copyCmd.copy(preview)}>
            {copyCmd.copied ? 'Copiado ✓' : 'Copiar comando'}
          </button>
        </div>
      )}

      {confirming && device && (
        <div className="faixa" role="alertdialog" aria-label="Confirmação">
          <strong className="faixa-atencao">ATENÇÃO</strong>
          <span className="faixa-texto">{confirmationText(c, value, device)}</span>
          <button type="button" className="btn btn-faixa" onClick={() => setConfirming(false)}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primario btn-faixa" onClick={() => {
            setConfirming(false)
            p.onRun(value, allowEmpty)
          }}>
            Sim, executar
          </button>
        </div>
      )}

      <OutputPanel
        run={p.run}
        device={device}
        generatesFile={!!c.gera_arquivo}
        onOpenFolder={p.onOpenFolder}
        onSave={p.onSaveOutput}
        onRestartServer={p.onRestartServer}
      />
    </div>
  )
}
