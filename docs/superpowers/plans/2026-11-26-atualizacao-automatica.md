# Atualização automática — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** o app instalado se atualiza pelas Releases do GitHub com um clique.
**Architecture:** plugin `updater` + `process` do Tauri; lógica do estado num hook testável (`useUpdater`) com a API injetada; script Node que gera e publica a Release.
**Tech Stack:** Tauri 2 (tauri-plugin-updater, tauri-plugin-process), React 19, Vitest, Node, gh CLI.
**Spec:** `docs/superpowers/specs/2026-11-26-atualizacao-automatica-design.md`

## Global Constraints
- Textos da interface em pt-BR; código em inglês.
- Endpoint: `https://github.com/danielneves2/adb-suite-mobiltec/releases/latest/download/latest.json`.
- Chave privada só em `%USERPROFILE%\.tauri\adb-suite.key`; nunca no repositório.
- Versão 0.3.0 em `package.json`, `Cargo.toml` e `tauri.conf.json`.
- Publicar no GitHub só com OK explícito.

## Review Focus
1. Verificação automática sem internet / sem release (404): não pode mostrar erro nem travar a abertura.
2. Clicar "Atualizar agora" com comando rodando: botão desligado.
3. Download sem `content-length` (total desconhecido): progresso sem %, não `NaN%`.
4. Clique duplo em "Atualizar agora": um download só.
5. Nome do asset com espaço quebrando a URL do `latest.json`.

### Task 1: lógica do atualizador
**Files:** Create `src/lib/updater.ts`, `src/state/useUpdater.ts`, `src/state/useUpdater.test.tsx`, `src/lib/updater.test.ts`
**Produces:**
- `interface AvailableUpdate { version: string; notes: string | null; install(onProgress: (p: { downloaded: number; total: number | null }) => void): Promise<void> }`
- `interface UpdaterApi { check(): Promise<AvailableUpdate | null>; relaunch(): Promise<void> }`
- `progressPercent(downloaded: number, total: number | null): number | null` (0–100, inteiro; null se total desconhecido/0)
- `tauriUpdater: UpdaterApi` (adaptador dos plugins; sem teste)
- `type UpdateState = {kind:'idle'} | {kind:'checking'} | {kind:'none'} | {kind:'available',version,notes} | {kind:'downloading',version,percent:number|null} | {kind:'restarting'} | {kind:'error',message}`
- `useUpdater(api: UpdaterApi, opts?: { autoCheck?: boolean }): { state: UpdateState; check(): Promise<void>; install(): Promise<void> }`
- [ ] Testes: progressPercent (50/100→50, total null→null, total 0→null, passa de 100→100); auto check acha → available; auto check falha → idle sem erro; check manual sem novidade → none; check manual falha → error "Não deu pra procurar atualização…"; install → downloading com % → relaunch chamado; install falha → error; install duas vezes → install da API chamado uma vez.
- [ ] Ver falhar, implementar, ver passar, commit.

### Task 2: interface
**Files:** Modify `src/components/StatusBar.tsx`, `src/components/Settings.tsx`, `src/App.tsx`, `src/styles/app.css`; tests nos `*.test.tsx` existentes desses componentes.
**Consumes:** `UpdateState`, `useUpdater`.
- [ ] StatusBar: props `update?: UpdateState`, `onInstallUpdate?: () => void`, `updateBlocked?: boolean`. available → "Versão X disponível" + botão "Atualizar agora" (desligado com title "Pare o comando antes de atualizar" se bloqueado); downloading → "Baixando atualização 42%" (ou "Baixando atualização…"); restarting → "Reiniciando…".
- [ ] Settings → Sobre: botão "Procurar atualização" (`onCheckUpdate`) e linha de resultado: checking "Procurando…", none "Você já está na versão mais nova.", error mensagem, available "Versão X disponível" + "Atualizar agora".
- [ ] App: `useUpdater(tauriUpdater, { autoCheck: true })`; bloqueado = `runner.view.phase === 'running'`.
- [ ] Ver falhar, implementar, ver passar, commit.

### Task 3: Tauri + chave + versão
**Files:** `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `package.json`
- [ ] `npm i @tauri-apps/plugin-updater @tauri-apps/plugin-process`; `cargo add tauri-plugin-updater tauri-plugin-process` (target desktop).
- [ ] Gerar a chave (`npx tauri signer generate --ci -w %USERPROFILE%\.tauri\adb-suite.key`), pubkey no conf, `createUpdaterArtifacts: true`, `plugins.updater.windows.installMode = "passive"`, permissões `updater:default`, `process:allow-restart`.
- [ ] Versão 0.3.0. `cargo test` + `npm test` + `npm run build` verdes. Commit.

### Task 4: script de publicação
**Files:** Create `scripts/release-lib.mjs`, `scripts/release-lib.test.mjs`, `scripts/publicar-versao.mjs`; Modify `vitest.config.ts` (include `scripts/**/*.test.mjs`).
**Produces:** `assetName(version) → "ADB-Suite-Mobiltec_<v>_x64-setup.exe"`, `downloadUrl(repo, version, asset)`, `buildLatestJson({version, notes, pubDate, signature, url})` → `{version, notes, pub_date, platforms: {"windows-x86_64": {signature, url}}}`.
- [ ] Testes dessas três; ver falhar; implementar; passar.
- [ ] `publicar-versao.mjs`: lê a versão do `tauri.conf.json`, exige árvore limpa, roda `npm run tauri build` com `TAURI_SIGNING_PRIVATE_KEY`, copia o setup com o nome sem espaço, escreve `latest.json` em `release/`, e (sem `--sem-publicar`) `gh release create v<versão>`.
- [ ] Rodar com `--sem-publicar` e conferir os arquivos. Commit.
