// Limpa o valor digitado/colado antes de montar o comando. Sem I/O.
import type { ParamKind } from './catalogTypes'

const QUOTED = /^(["'])(.*)\1$/s

/**
 * Arquivo/APK/caminho: tira espaços das pontas e um par de aspas em volta (o "Copiar como caminho"
 * do Windows cola `"C:\...\app.apk"`, e o adb recebia as aspas como parte do nome).
 * Pacote: só os espaços. Texto livre e sem parâmetro: intocados (aspas podem ser de propósito).
 */
export function cleanValue(kind: ParamKind | null | undefined, value: string): string {
  if (kind === 'apk' || kind === 'file' || kind === 'path') {
    const trimmed = value.trim()
    const m = QUOTED.exec(trimmed)
    return m ? m[2].trim() : trimmed
  }
  if (kind === 'pkg') return value.trim()
  return value
}
