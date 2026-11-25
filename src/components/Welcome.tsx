import { useState } from 'react'
import { validateUserName } from '../lib/user'
import { Brand } from './Brand'

/** Primeira abertura: só o nome. Fica salvo e não pergunta de novo. */
export function Welcome({ onEnter }: { onEnter: (name: string) => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="boas-vindas">
      <form
        className="boas-vindas-card"
        onSubmit={(e) => {
          e.preventDefault()
          const problem = validateUserName(name)
          if (problem) setError(problem)
          else onEnter(name.trim())
        }}
      >
        <Brand />
        <h1 className="boas-vindas-titulo">Como você se chama?</h1>
        <p className="boas-vindas-texto">Só o nome. Ele aparece nos comandos que você criar e fica salvo neste computador.</p>
        <label className="sr-only" htmlFor="seu-nome">
          Seu nome
        </label>
        <input
          id="seu-nome"
          className="campo boas-vindas-campo"
          value={name}
          placeholder="ex.: Daniel Lima"
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        {error && (
          <p className="form-erro" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primario boas-vindas-botao">
          Entrar
        </button>
      </form>
    </div>
  )
}
