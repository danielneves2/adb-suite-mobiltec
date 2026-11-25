import { useState } from 'react'
import android from '../../assets/android-neon.png'
import { initials, validateUserName } from '../lib/user'
import { Brand } from './Brand'
import { Icon } from './icons'

export interface WelcomeProps {
  onEnter: (name: string) => void
  /** Perfis que já entraram neste PC (o mais recente primeiro). */
  knownUsers?: string[]
  onForget?: (name: string) => void
}

/** Tela de entrada: só o nome (é o login), com os perfis já usados neste PC. */
export function Welcome({ onEnter, knownUsers = [], onForget }: WelcomeProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="boas-vindas">
      <div className="boas-vindas-card">
        {/* Topo laranja com os cantos cortados na diagonal (como na referência) */}
        <span className="bv-topo" aria-hidden="true" />
        <span className="bv-canto bv-canto-esq" aria-hidden="true" />
        <span className="bv-canto bv-canto-dir" aria-hidden="true" />
        <form
          className="boas-vindas-form"
          onSubmit={(e) => {
            e.preventDefault()
            const problem = validateUserName(name)
            if (problem) setError(problem)
            else onEnter(name.trim())
          }}
        >
          <div className="boas-vindas-marca-estreita">
            <Brand />
          </div>
          <div>
            <h1 className="boas-vindas-titulo">Como você quer ser chamado?</h1>
            <p className="boas-vindas-texto">Informe apenas seu nome. Ele será exibido nos comandos criados e salvo neste computador.</p>
          </div>
          {knownUsers.length > 0 && (
            <div className="perfis">
              <span className="rotulo">Entrar como</span>
              <ul className="perfis-lista">
                {knownUsers.map((u) => (
                  <li key={u} className="perfis-item">
                    <button type="button" className="perfis-entrar" aria-label={`Entrar como ${u}`} onClick={() => onEnter(u)}>
                      <span className="perfil-avatar" aria-hidden="true">
                        {initials(u)}
                      </span>
                      <span className="perfis-nome">{u}</span>
                    </button>
                    {onForget && (
                      <button type="button" className="perfis-esquecer" aria-label={`Esquecer ${u}`} title="Tirar da lista" onClick={() => onForget(u)}>
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="boas-vindas-separador">
                <span>ou digite outro nome</span>
              </p>
            </div>
          )}
          <div className="boas-vindas-campo">
            <span className="boas-vindas-campo-icone">
              <Icon name="usuario" size={20} />
            </span>
            <label className="sr-only" htmlFor="seu-nome">
              Seu nome
            </label>
            <input
              id="seu-nome"
              value={name}
              placeholder="Ex.: Daniel Lima"
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </div>
          {error && (
            <p className="form-erro" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primario boas-vindas-botao">
            Entrar
          </button>
          <p className="boas-vindas-separador">
            <span>sem senha · sem e-mail</span>
          </p>
          <p className="boas-vindas-rodape">
            <Icon name="escudo" size={18} />
            <span>Dados salvos somente neste dispositivo</span>
          </p>
        </form>
        <div className="boas-vindas-arte">
          {/* Divisória com degrau diagonal */}
          <svg className="bv-divisoria" viewBox="0 0 44 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M43 0 V36 L3 46 V100" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="boas-vindas-chao" aria-hidden="true" />
          <img className="boas-vindas-android" src={android} alt="" />
          <div className="boas-vindas-marca">
            <Brand />
          </div>
        </div>
      </div>
    </div>
  )
}
