// Partes puras da publicação de versão (testadas em release-lib.test.mjs).

export const REPO = 'danielneves2/adb-suite-mobiltec'

/** Nome do instalador na Release. Sem espaço: o GitHub troca espaço por ponto e a URL do latest.json quebraria. */
export function assetName(version) {
  return `ADB-Suite-Mobiltec_${version}_x64-setup.exe`
}

export function downloadUrl(repo, version, asset) {
  return `https://github.com/${repo}/releases/download/v${version}/${asset}`
}

/** Variáveis da API que faltam no .env.local (sem elas o instalador sai sem sincronizar com o time). */
export function missingBuildEnv(envText) {
  const values = Object.fromEntries(
    envText
      .replace(/^﻿/, '')
      .split(/\r?\n/)
      .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].trim().replace(/^"|"$/g, '')]),
  )
  return ['VITE_API_URL', 'VITE_APP_KEY'].filter((k) => !values[k])
}

/** Manifesto que o plugin updater do Tauri lê em releases/latest/download/latest.json. */
export function buildLatestJson({ version, notes, pubDate, signature, url }) {
  return {
    version,
    notes,
    pub_date: pubDate.toISOString(),
    platforms: { 'windows-x86_64': { signature: signature.trim(), url } },
  }
}
