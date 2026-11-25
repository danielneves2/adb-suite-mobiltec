import { useRef, useState } from 'react'
import { deviceName, type DeviceInfo } from '../lib/appLogic'
import type { ParamKind } from '../lib/catalogTypes'
import {
  MY_CATEGORY,
  PARAM_OPTIONS,
  PLACEHOLDERS,
  categoryOptions,
  insertAt,
  normalizeCategory,
  paramForPlaceholder,
  previewLines,
  validateCommandForm,
  type CommandFormData,
} from '../lib/commandForm'

export interface CommandFormProps {
  initial: CommandFormData
  editing: boolean
  device: DeviceInfo | null
  deviceDir: string | null
  onSave: (f: CommandFormData) => void
  onCancel: () => void
  /** Categorias já criadas pelo técnico (aparecem no select). */
  customCategories?: string[]
}

const NEW_CATEGORY = '__nova__'

export function CommandForm({ initial, editing, device, deviceDir, onSave, onCancel, customCategories = [] }: CommandFormProps) {
  const [f, setF] = useState<CommandFormData>(initial)
  const options = categoryOptions([...customCategories, initial.categoria])
  // "+ Nova categoria…": o select fica nessa opção e o nome vem do campo de texto.
  const [newCategory, setNewCategory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const commandBox = useRef<HTMLTextAreaElement>(null)

  const change = <K extends keyof CommandFormData>(key: K, value: CommandFormData[K]) => {
    setF((v) => ({ ...v, [key]: value }))
    setError(null)
  }

  const save = () => {
    const data = { ...f, categoria: normalizeCategory(f.categoria, customCategories) }
    const problem = validateCommandForm(data)
    if (problem) setError(problem)
    else onSave(data)
  }

  /** Marcador clicável: entra onde está o cursor e, se for de valor, ajusta "O comando pede". */
  const insertPlaceholder = (token: string) => {
    const el = commandBox.current
    const start = el?.selectionStart ?? f.comando.length
    const end = el?.selectionEnd ?? f.comando.length
    const r = insertAt(f.comando, start, end, token)
    const kind = paramForPlaceholder(token)
    setF((v) => ({ ...v, comando: r.text, parametro: kind ?? v.parametro }))
    setError(null)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(r.cursor, r.cursor)
    })
  }

  const serial = device?.serial ?? '<aparelho>'
  const preview = previewLines(f, serial, deviceDir ?? '{d}')

  return (
    <form
      className="formulario"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          save()
        }
      }}
    >
      <div className="form-cabecalho">
        <span className="rotulo">{MY_CATEGORY} /</span>
        <h1 className="comando-nome">{editing ? 'Editar comando' : 'Novo comando'}</h1>
        <p className="comando-resumo">Fica salvo no seu perfil neste computador. Quando a sincronização chegar, ele vai pro time todo.</p>
      </div>

      <div className="form-corpo">
        <div className="form-campos">
          <div className="form-linha">
            <div className="form-campo">
              <label className="rotulo" htmlFor="f-nome">
                Nome do comando
              </label>
              <input id="f-nome" className="campo campo-ui" value={f.nome} placeholder="ex.: Abrir config. de Wi-Fi" onChange={(e) => change('nome', e.target.value)} autoComplete="off" autoFocus />
            </div>
            <div className="form-campo">
              <label className="rotulo" htmlFor="f-categoria">
                Categoria
              </label>
              <select
                id="f-categoria"
                className="campo"
                value={newCategory ? NEW_CATEGORY : f.categoria}
                onChange={(e) => {
                  if (e.target.value === NEW_CATEGORY) {
                    setNewCategory(true)
                    change('categoria', '')
                  } else {
                    setNewCategory(false)
                    change('categoria', e.target.value)
                  }
                }}
              >
                {options.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={NEW_CATEGORY}>+ Nova categoria…</option>
              </select>
              {newCategory && (
                <input
                  className="campo campo-ui"
                  aria-label="Nome da nova categoria"
                  placeholder="ex.: Rede, Bateria, Kiosk"
                  value={f.categoria}
                  maxLength={24}
                  onChange={(e) => change('categoria', e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              )}
            </div>
          </div>

          <div className="form-campo">
            <label className="rotulo" htmlFor="f-resumo">
              Pra que serve <span className="form-opcional">(opcional)</span>
            </label>
            <input id="f-resumo" className="campo campo-ui" value={f.resumo} placeholder="Uma frase que ajude o colega a entender" onChange={(e) => change('resumo', e.target.value)} autoComplete="off" />
          </div>

          <div className="form-campo">
            <label className="rotulo" htmlFor="f-comando">
              Comando adb
            </label>
            <textarea
              id="f-comando"
              ref={commandBox}
              className="campo-comando terminal"
              rows={4}
              value={f.comando}
              placeholder="adb shell am start -a android.settings.WIFI_SETTINGS"
              onChange={(e) => change('comando', e.target.value)}
              spellCheck={false}
            />
            <p className="form-ajuda">Um comando por linha, sem o -s (o app coloca o aparelho selecionado).</p>
          </div>

          <div className="form-linha">
            <div className="form-campo">
              <label className="rotulo" htmlFor="f-parametro">
                O comando pede
              </label>
              <select id="f-parametro" className="campo" value={f.parametro ?? ''} onChange={(e) => change('parametro', (e.target.value || null) as ParamKind | null)}>
                {PARAM_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value ?? ''}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="form-check">
              <input type="checkbox" checked={f.pede_confirmacao} onChange={(e) => change('pede_confirmacao', e.target.checked)} />
              Pedir confirmação antes de rodar
            </label>
          </div>
        </div>

        <aside className="form-lado">
          <div className="form-campo">
            <span className="rotulo">Marcadores</span>
            <div className="marcadores">
              {PLACEHOLDERS.map((m) => (
                <button key={m.token} type="button" className="marcador-botao" aria-label={`Inserir ${m.token}`} title={m.hint} onClick={() => insertPlaceholder(m.token)}>
                  <code>{m.token}</code>
                  <span>{m.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="form-campo">
            <span className="rotulo">Prévia no {device ? deviceName(device) : 'aparelho'}</span>
            <div className="caixa-comando form-previa">
              <code className="terminal">{preview.map((l) => `$ ${l}`).join('\n')}</code>
            </div>
          </div>
        </aside>
      </div>

      <div className="form-rodape">
        {error ? (
          <p className="form-rodape-erro" role="alert">
            {error}
          </p>
        ) : (
          <p className="form-rodape-dica">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> salva
          </p>
        )}
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primario btn-executar">
          {editing ? 'Salvar alterações' : 'Salvar comando'}
        </button>
      </div>
    </form>
  )
}
