// Gera o instalador assinado e publica a versão nas Releases do GitHub (o app instalado se atualiza por lá).
//
//   node scripts/publicar-versao.mjs --sem-publicar        só gera em release/v<versão>/ (pra conferir)
//   node scripts/publicar-versao.mjs --notas "O que mudou"  gera e publica (precisa estar na main, igual ao GitHub)
//
// A versão vem do src-tauri/tauri.conf.json. A chave fica em %USERPROFILE%\.tauri\adb-suite.key (nunca no repositório).
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REPO, assetName, buildLatestJson, downloadUrl, missingBuildEnv } from './release-lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const publish = !args.includes('--sem-publicar')
const notesIdx = args.indexOf('--notas')

function fail(msg) {
  console.error(`\n✖ ${msg}`)
  process.exit(1)
}

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd: root, encoding: 'utf8', ...opts })
  if (r.error) fail(`Não deu pra rodar ${cmd}: ${r.error.message}`)
  return r
}

const version = JSON.parse(readFileSync(join(root, 'src-tauri', 'tauri.conf.json'), 'utf8')).version
const notes = notesIdx >= 0 && args[notesIdx + 1] ? args[notesIdx + 1] : `Versão ${version}`
const tag = `v${version}`
console.log(`ADB Suite – Mobiltec ${version}${publish ? '' : ' (sem publicar)'}`)

const keyPath = join(homedir(), '.tauri', 'adb-suite.key')
if (!existsSync(keyPath)) fail(`Chave de assinatura não encontrada em ${keyPath}.`)

// Sem a API no build, o instalador sai em modo local (não sincroniza) e ninguém percebe.
const envPath = join(root, '.env.local')
const missing = missingBuildEnv(existsSync(envPath) ? readFileSync(envPath, 'utf8') : '')
if (missing.length) fail(`Falta no .env.local: ${missing.join(', ')}. Sem isso o app publicado não sincroniza com o time.`)

if (publish) {
  if (run('git', ['status', '--porcelain']).stdout.trim()) fail('Tem alteração sem commit. Faça o commit antes de publicar.')
  if (run('git', ['branch', '--show-current']).stdout.trim() !== 'main') fail('Publique a partir da main.')
  run('git', ['fetch', 'origin', 'main'])
  if (run('git', ['rev-parse', 'HEAD']).stdout.trim() !== run('git', ['rev-parse', 'origin/main']).stdout.trim())
    fail('A main local está diferente da do GitHub. Faça o push (ou pull) antes.')
  if (run('gh', ['release', 'view', tag, '--repo', REPO]).status === 0) fail(`A Release ${tag} já existe. Suba a versão no tauri.conf.json, package.json e Cargo.toml.`)
}

console.log('\n→ Gerando o instalador assinado…')
const build = run('npm', ['run', 'tauri', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PATH: `${join(homedir(), '.cargo', 'bin')};${process.env.PATH}`,
    TAURI_SIGNING_PRIVATE_KEY: readFileSync(keyPath, 'utf8'),
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: '',
  },
})
if (build.status !== 0) fail('O build falhou (veja acima).')

const nsis = join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis')
const setup = join(nsis, `ADB Suite - Mobiltec_${version}_x64-setup.exe`)
if (!existsSync(setup) || !existsSync(`${setup}.sig`)) fail(`Não achei ${setup} e a assinatura (.sig).`)

const out = join(root, 'release', tag)
mkdirSync(out, { recursive: true })
const asset = assetName(version)
copyFileSync(setup, join(out, asset))
const latest = buildLatestJson({
  version,
  notes,
  pubDate: new Date(),
  signature: readFileSync(`${setup}.sig`, 'utf8'),
  url: downloadUrl(REPO, version, asset),
})
writeFileSync(join(out, 'latest.json'), JSON.stringify(latest, null, 2))
console.log(`\n✔ Arquivos em ${out}:\n   ${asset}\n   latest.json`)

if (!publish) process.exit(0)

console.log(`\n→ Publicando ${tag} no GitHub…`)
const head = run('git', ['rev-parse', 'HEAD']).stdout.trim()
const rel = run(
  'gh',
  ['release', 'create', tag, join(out, asset), join(out, 'latest.json'), '--repo', REPO, '--target', head, '--title', `ADB Suite – Mobiltec ${version}`, '--notes', notes],
  { stdio: 'inherit' },
)
if (rel.status !== 0) fail('Não deu pra criar a Release.')
console.log(`\n✔ Publicado. Os apps instalados vão achar a ${version} na próxima vez que abrirem.`)
