// Partes puras da publicação de versão (testadas em release-lib.test.mjs).

export const REPO = 'danielneves2/adb-suite-mobiltec'

/** Nome do instalador na Release. Sem espaço: o GitHub troca espaço por ponto e a URL do latest.json quebraria. */
export function assetName(version) {
  return `ADB-Suite-Mobiltec_${version}_x64-setup.exe`
}

export function downloadUrl(repo, version, asset) {
  return `https://github.com/${repo}/releases/download/v${version}/${asset}`
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
