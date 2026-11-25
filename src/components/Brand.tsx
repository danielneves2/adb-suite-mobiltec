import icone from '../../assets/icone-app.svg'

/** Marca: ícone [>>_] + [ ADB SUITE / M O B I L T E C ] + /// */
export function Brand() {
  return (
    <div className="marca" role="img" aria-label="ADB Suite – Mobiltec">
      <img className="marca-icone" src={icone} alt="" width={30} height={30} />
      <span className="marca-colchete marca-colchete-esq" aria-hidden="true" />
      <span className="marca-pilha" aria-hidden="true">
        <span className="marca-nome">ADB SUITE</span>
        <span className="marca-sub">MOBILTEC</span>
      </span>
      <span className="marca-colchete marca-colchete-dir" aria-hidden="true" />
      <span className="marca-barras" aria-hidden="true">
        ///
      </span>
    </div>
  )
}
