# Etapa 2 – App Tauri com adb embutido · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Janela desktop Windows que detecta aparelhos, mostra o catálogo local (46 comandos) no layout aprovado e roda cada comando no aparelho selecionado com o adb embutido — normal, contínuo (com Parar) e terminal — salvando/copiando a saída.

**Architecture:** React + TS (Vite) na UI; lógica pura em `src/lib/` (testada com Vitest); fronteira com o Rust só em `src/lib/adb.ts` (`invoke`/`listen`). Rust em `src-tauri/src/` com módulos pequenos: `adb_path`, `runner` (passos, redirecionamento, cancelamento), `devices`, `stream`, `extras` (clipboard, zip, abrir pasta/terminal). adb + DLLs do platform-tools como **resources** do bundle, baixados por script (fora do git). Catálogo vem do `data/catalog.json` embutido; login/sync/cadastro ficam pra etapa 4.

**Tech Stack:** Tauri 2 (CLI/API 2.12.x, crates `tauri = "2"`), React 19, Vite 8, TypeScript strict, Vitest + @testing-library/react + jsdom, `@tauri-apps/plugin-store`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-opener`, `@fontsource/space-mono`, `@fontsource/vt323`. Rust: `tokio` (process, io-util, sync), `arboard`, `image` (png), `zip`, `serde`, `tempfile` (dev).

**Spec:** `docs/superpowers/specs/2026-11-24-adb-suite-mvp-design.md` (§3, §6, §8, §9, §11) + `docs/superpowers/specs/2026-11-24-ui-referencia-prototipo.md` (textos, cores e tamanhos exatos) + `docs/DESIGN.md`.

## Global Constraints
- Windows x64. O app nunca usa adb do PATH: sempre `<resource_dir>/adb/adb.exe`.
- Todo processo filho no Windows com `CREATE_NO_WINDOW` (0x08000000) — nada de janela preta piscando. Exceção: `open_terminal`.
- adb recebe argv direto (sem `cmd.exe`); o montador da etapa 1 (`buildCommand`/`buildFreeCommand`) é a única fonte dos args.
- Comandos são dados: a UI decide comportamento por `modo`, `acao_extra`, `parametro`, `gera_arquivo`, `pede_confirmacao`, `escolha` — nunca por `id`.
- Textos da UI exatamente como na referência de UI (pt-BR), salvo os rulings abaixo. Cantos retos, sem sombra. Fontes locais (sem CDN).
- Saídas (logs, prints, serial) nunca saem da máquina.
- Nada de `.env*` nem `src-tauri/binaries/` no git.

## Rulings desta etapa (decididos pelo executor, conforme "siga suas recomendações")
1. adb + DLLs vão como `resources` (`binaries/adb/*` → `adb/`) em vez de `externalBin`: as DLLs precisam ficar na mesma pasta do adb.exe, em dev e no instalador.
2. Seletor de aparelho mostra o serial (MVP) em 10 px abaixo de "Android NN".
3. Cartão "Outro…" aparece em **todo** comando com `escolha` (CLAUDE.md regra 7); rótulo = `opcao_outro` ou "Outro…".
4. Ordem da barra de ícones = protótipo (Fixados, Apps, Pacotes, Telas, Controle, Logs, Captura, Aparelho, Arquivos, Conexão, Meus).
5. "Salvar saída" grava `saida_{agora}.txt` (mesmo padrão AAAAMMDD_HHMM).
6. Campo vazio **não** usa o placeholder: mostra o erro do montador ("Preencha o valor antes de executar.").
7. Pacotes: `<datalist>` com `pm list packages -3` do aparelho (carregado ao selecionar o aparelho) + chips "Atalhos:" de `pacotes_sugeridos` quando o comando `pkg` não tem atalhos.
8. Comandos normais não têm timeout; enquanto roda, o botão Executar vira **■ Parar** (cancela o processo).
9. Erro (exit ≠ 0): status "erro (código N) em X s"; corpo mostra stdout e depois stderr.
10. Sem aparelho: botão do topo "Nenhum aparelho conectado" (vazado) e Executar desabilitado com "Conecte um aparelho". `unauthorized`: "<serial> · não autorizado — confirme a depuração no aparelho". `offline`: "<serial> · offline".
11. "+ Novo comando", Editar/Excluir, Importar/Exportar e "Salvar como comando": **fora desta etapa** (etapa 4). Botões não aparecem.
12. Cores extras da referência viram tokens CSS em `src/styles/tokens.css`.

## Review Focus
1. Pasta de saída ou nome de aparelho com espaço/acentos/caracteres inválidos (`Galaxy A54 5G`, `moto g(30)`) → pasta criada e arquivo salvo sem erro. (Task 6 `deviceFolderName`, Task 3 `run_steps`)
2. Aparelho desplugado no meio da execução / adb devolvendo `error: device not found` → status de erro legível, app não trava, próximo comando funciona. (Task 3 teste de exit ≠ 0)
3. Saída grande (logcat -d com 50 000+ linhas) e saída com bytes não-UTF-8 → painel não congela, texto aparece com substituição. (Task 3 `decode_output`, Task 5 limite de 5 000 linhas)
4. Dois comandos disparados em sequência rápida / trocar de aparelho enquanto roda → o resultado de um não aparece no outro: a UI ignora eventos de `runId` antigo. (Task 9, teste "resultado de execução antiga é ignorado")
5. Outro adb (versão diferente) já rodando na máquina → "Diagnosticar conexão" mostra o aviso e o botão "Reiniciar servidor adb". (Task 4 `adb_server_conflict`)

---

### Task 1: Scaffold Tauri 2 + React no repositório

**Files:**
- Create: `index.html`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/styles/tokens.css`, `src/styles/global.css`, `src-tauri/` (Cargo.toml, tauri.conf.json, build.rs, src/main.rs, src/lib.rs, capabilities/default.json, icons/)
- Modify: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`

**Interfaces:**
- Produces: `npm run tauri dev` abre janela "ADB Suite – Mobiltec" 1280×800 (mín. 960×600) com o `App` vazio estilizado; `npm test` continua com os 116 testes.

- [ ] **Step 1:** Gerar com `npm create tauri-app@latest` (template `react-ts`, identifier `br.com.mobiltec.adbsuite`) numa pasta temporária do scratchpad e copiar `src-tauri/`, `index.html`, `vite.config.ts`, `src/main.tsx` pro repo. Mesclar dependências no `package.json` existente (manter `test`/`typecheck`; adicionar `dev`, `build`, `tauri`). Ícones: gerar com `npx tauri icon assets/logo-mobiltec.png`.
- [ ] **Step 2:** `tsconfig.json`: adicionar `"jsx": "react-jsx"`, `"lib": ["ES2022","DOM","DOM.Iterable"]`. `vitest.config.ts`: `include` também `src/**/*.test.tsx`; cada `*.test.tsx` começa com `// @vitest-environment jsdom`, `setupFiles` com `@testing-library/jest-dom/vitest`.
- [ ] **Step 3:** `tokens.css` com todos os tokens do DESIGN.md + extras da referência (`--borda-sel:#46414C`, `--marcador-vazio:#8A8590`, `--texto-3:#C9C4CC`, `--texto-lista:#DCD7DF`, `--roxo-claro-sel:#F4C2E7`, `--chip:#1B191F`, `--btn-copiar:#19161C`, `--btn-copiar-texto:#F2EFF5`, `--meta:#A9A2B2`, `--ocioso:#B3ACBB`). `global.css`: Space Mono 12 px, VT323 em `.terminal`, `border-radius:0` global, `body` fundo `--bg`.
- [ ] **Step 4:** `.gitignore` += `src-tauri/target/` (já), `src-tauri/gen/schemas/` não (commit). Verificar: `npm run build` → sem erro; `cd src-tauri && cargo check` → sem erro; `npm test` → 116 passed.
- [ ] **Step 5:** Rodar `npm run tauri dev` e confirmar a janela abrindo (screenshot ou observação no ledger). Commit `chore: scaffold Tauri 2 + React`.

---

### Task 2: adb embutido (script + resources + resolução do caminho)

**Files:**
- Create: `scripts/baixar-platform-tools.ps1`, `src-tauri/src/adb_path.rs`, `src-tauri/binaries/.gitkeep`
- Modify: `src-tauri/tauri.conf.json` (`bundle.resources: { "binaries/adb/*": "adb/" }`), `src-tauri/src/lib.rs`, `README.md` (seção "Rodar o app em desenvolvimento")

**Interfaces:**
- Produces (Rust): `pub fn adb_path(resource_dir: &Path) -> PathBuf` (`resource_dir/adb/adb.exe`); `#[tauri::command] async fn adb_version(app) -> Result<String, String>` (1ª linha de `adb version`).

- [ ] **Step 1:** Script: baixa `https://dl.google.com/android/repository/platform-tools-latest-windows.zip` pra `%TEMP%`, extrai, copia `adb.exe`, `AdbWinApi.dll`, `AdbWinUsbApi.dll` pra `src-tauri/binaries/adb/`, imprime `adb version`. Idempotente; `-Force` rebaixa.
- [ ] **Step 2: Teste que falha** (`adb_path.rs`, `#[cfg(test)]`): `adb_path(Path::new("C:\\app"))` == `C:\app\adb\adb.exe`.
- [ ] **Step 3:** `cargo test adb_path` → FAIL; implementar; → PASS.
- [ ] **Step 4:** Registrar `adb_version`; no `App.tsx` provisório mostrar o retorno. Rodar o script, `npm run tauri dev` → janela mostra "Android Debug Bridge version 1.0.41" (ou mais novo). Conferir `git status` sem binários. Commit `feat: adb embutido como resource`.

---

### Task 3: Executor de passos (Rust)

**Files:**
- Create: `src-tauri/src/runner.rs`
- Modify: `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml` (`tokio` features `process,io-util,sync,macros,rt`, `tempfile` dev)

**Interfaces:**
- Consumes: `Step` da etapa 1 (`{ args, redirectTo?, usesPrevious }`) serializado camelCase.
- Produces:
  ```rust
  #[derive(Deserialize)] #[serde(rename_all="camelCase")] pub struct StepIn { pub args: Vec<String>, pub redirect_to: Option<String>, pub uses_previous: bool }
  #[derive(Serialize)]   #[serde(rename_all="camelCase")] pub struct StepOut { pub stdout: String, pub stderr: String, pub exit_code: i32, pub duration_ms: u64, pub saved_to: Option<String> }
  pub fn resolve_previous(stdout: &str) -> Option<String>      // 1ª linha não vazia, trim, sem prefixo "package:"
  pub fn unique_path(p: &Path) -> PathBuf                      // x.txt → x_2.txt → x_3.txt se existir
  pub fn decode_output(bytes: &[u8]) -> String                 // UTF-8 lossy, \r\n → \n
  pub async fn run_steps_with(program: &Path, steps: Vec<StepIn>, ensure_dir: Option<PathBuf>, cancel: CancellationToken) -> Result<Vec<StepOut>, String>
  #[tauri::command] async fn run_steps(app, run_id: String, steps: Vec<StepIn>, device_dir: Option<String>) -> Result<Vec<StepOut>, String>
  #[tauri::command] fn cancel_run(run_id: String)
  ```
  Regras: cria `device_dir` e o pai de cada `redirect_to`; `redirect_to` grava stdout **binário** em `unique_path(..)` e devolve `saved_to`, com `stdout` = "" ; troca o arg literal `{anterior}` por `resolve_previous(stdout anterior)` (erro "Não deu pra ler o resultado do passo anterior." se `None`); para no primeiro `exit_code != 0`; `cancel_run` mata o processo e devolve erro "Cancelado.". Registro de cancelamento: `Mutex<HashMap<String, CancellationToken>>` no `State` (use `tokio_util::sync::CancellationToken` ou um `oneshot`).

- [ ] **Step 1: Testes que falham** (`cargo test runner`):
  - `resolve_previous("package:/data/app/~~a==/x-1==/base.apk\n")` == `Some("/data/app/~~a==/x-1==/base.apk")`; `resolve_previous("\n\n")` == `None`.
  - `unique_path` com tempdir contendo `log.txt` e `log_2.txt` → `log_3.txt`; inexistente → igual.
  - `decode_output(b"a\r\n\xff b")` == `"a\n\u{FFFD} b"`.
  - `run_steps_with(cmd.exe, [args ["/C","echo","package:C:\\x"]], [args ["/C","echo","{anterior}"], usesPrevious])` → 2º stdout contém `C:\x`.
  - redirecionamento: `["/C","echo","oi"]` com `redirect_to = tmp/sub dir/a.txt` → arquivo existe com `oi`, `saved_to` aponta pra ele, pasta "sub dir" criada.
  - exit ≠ 0: `["/C","exit","3"]` seguido de outro passo → 1 resultado, `exit_code == 3`.
- [ ] **Step 2:** FAIL → implementar → `cargo test` PASS.
- [ ] **Step 3:** Commit `feat: executor de passos com redirecionamento e cancelamento`.

---

### Task 4: Aparelhos (Rust)

**Files:**
- Create: `src-tauri/src/devices.rs`

**Interfaces:**
- Produces:
  ```rust
  #[derive(Serialize, Clone, PartialEq, Debug)] #[serde(rename_all="camelCase")]
  pub struct Device { pub serial: String, pub state: String /* device|unauthorized|offline|... */, pub brand: Option<String>, pub model: Option<String>, pub android: Option<String> }
  pub fn parse_devices(output: &str) -> Vec<(String, String)>          // (serial, state), ignora cabeçalho/linhas "*"
  pub fn parse_getprop(output: &str) -> (Option<String>, Option<String>, Option<String>) // manufacturer, model, release de "[k]: [v]"
  pub fn adb_server_conflict(stderr: &str) -> bool                     // "adb server version (X) doesn't match this client"
  #[tauri::command] async fn list_devices(app) -> Result<Vec<Device>, String>   // cache de getprop por serial em State
  #[tauri::command] async fn restart_adb_server(app) -> Result<(), String>      // kill-server + start-server
  #[tauri::command] async fn list_packages(app, serial: String) -> Result<Vec<String>, String> // pm list packages -3, sem "package:", ordenado
  ```
  Marca com 1ª letra maiúscula (`samsung` → `Samsung`).

- [ ] **Step 1: Testes que falham:** `parse_devices` com saída real de `adb devices -l` contendo `device`, `unauthorized`, `offline` e linha `* daemon started successfully` → 3 tuplas corretas; saída vazia → `[]`. `parse_getprop` com as 3 chaves → valores; sem chave → `None`. `adb_server_conflict` true/false.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit `feat: detecção de aparelhos`.

---

### Task 5: Execução contínua e extras (Rust)

**Files:**
- Create: `src-tauri/src/stream.rs`, `src-tauri/src/extras.rs`
- Modify: `src-tauri/Cargo.toml` (`arboard`, `image` default-features=false features=["png"], `zip`), `src-tauri/capabilities/default.json`

**Interfaces:**
- Produces:
  ```rust
  // stream.rs — evento "stream-output" { runId, lines: Vec<String> } em lotes (≤ 100 ms), evento "stream-end" { runId, exitCode, savedTo }
  #[tauri::command] async fn start_stream(app, run_id: String, step: StepIn, device_dir: Option<String>) -> Result<(), String>
  #[tauri::command] async fn stop_stream(app, run_id: String, stop_step: Option<StepIn>, after_step: Option<StepIn>) -> Result<Option<StepOut>, String>
  pub async fn stream_with(program: &Path, step: StepIn, on_lines: impl FnMut(Vec<String>), cancel: CancellationToken) -> Result<i32, String>
  // extras.rs
  pub fn zip_dir(dir: &Path, zip_path: &Path) -> Result<(), String>
  #[tauri::command] fn copy_image_to_clipboard(path: String) -> Result<(), String>   // PNG → RGBA → arboard
  #[tauri::command] fn zip_folder(dir: String, zip_path: String) -> Result<String, String>
  #[tauri::command] fn write_text_file(path: String, contents: String) -> Result<String, String> // unique_path, cria pasta
  #[tauri::command] fn open_terminal(app, serial: String) -> Result<(), String> // cmd /K com PATH=<pasta do adb>;%PATH% e "adb -s <serial> shell"
  ```
  Stream com `redirect_to`: grava cada linha no arquivo **e** emite. `stop_stream`: roda `stop_step` (se houver), espera até 3 s o processo sair, senão mata; depois roda `after_step`.

- [ ] **Step 1: Testes que falham:** `stream_with(cmd.exe, ["/C","echo a& echo b"])` coleta `["a","b"]` e retorna 0; `zip_dir` de tempdir com 2 arquivos → zip com 2 entradas (ler de volta com `zip::ZipArchive`).
- [ ] **Step 2:** FAIL → implementar → PASS. Registrar todos os comandos em `lib.rs`; `capabilities/default.json` com `core:default`, `store:default`, `dialog:default`, `opener:default` (+ `opener:allow-open-path` para a pasta de saída).
- [ ] **Step 3:** Commit `feat: execução contínua, clipboard de imagem, zip e terminal`.

---

### Task 6: Lógica pura da UI (TS)

**Files:**
- Create: `src/lib/appLogic.ts`, `src/lib/appLogic.test.ts`

**Interfaces:**
- Consumes: `Command`, `Catalog` (etapa 1), `formatTimestamp`.
- Produces:
  ```ts
  export interface DeviceInfo { serial: string; state: string; brand?: string; model?: string; android?: string }
  export const RAIL: readonly { key: string; label: string }[]   // ordem do Ruling 4; key 'Fixados' | categoria | 'Meus'
  export function deviceFolderName(d: DeviceInfo): string       // "<Marca>-<Modelo espaços→->_<SERIAL>", troca <>:"/\|?* por _
  export function deviceDir(base: string, d: DeviceInfo): string
  export function filterCommands(cmds: Command[], o: { search: string; rail: string; pinned: string[] }): Command[]
  export function togglePinned(pinned: string[], id: string): string[]
  export function initialValue(c: Command): string             // 1º atalho; pkg sem atalho → 'br.com.mobiltec.c4m.android.agent'; senão ''
  export function confirmationText(c: Command, value: string, d: DeviceInfo): string
  export function metaLine(d: DeviceInfo, at: Date): string     // "# Samsung Galaxy A54 · Android 14 · serial R58N · 24/11/2026 14:32"
  export function ticketText(d: DeviceInfo, display: string, output: string, at: Date): string
  export function formatDuration(ms: number): string           // 600 → "0,6 s"
  export function deviceLabel(d: DeviceInfo): string            // "Samsung Galaxy A54" | "<serial> · não autorizado — confirme a depuração no aparelho" | "<serial> · offline"
  ```
- [ ] **Step 1: Testes que falham** (valores exatos da referência de UI §4–§6):
  - `deviceFolderName({brand:'Samsung',model:'Galaxy A54 5G',serial:'R58N'})` → `Samsung-Galaxy-A54-5G_R58N`; `model:'moto g(30)'`, `brand:'motorola'` → `motorola-moto-g(30)_X`; `model:'A/B:C'` → `A_B_C` no meio.
  - `filterCommands` com busca "apk" acha por nome, comando ou resumo, ignorando maiúsculas e todas as categorias; rail `Fixados` respeita a ordem de `pinned`; rail `Meus` = `oficial === false`; excluídos nunca aparecem.
  - `confirmationText(desinstalar, 'br.com.x', {brand:'Samsung',model:'Galaxy A54',serial:'R58N12ABCDE'})` → `Você vai desinstalar br.com.x no Samsung Galaxy A54 (R58N12ABCDE). Isso pode não ter volta.` (`texto_confirmacao` do catálogo com `{p}` trocado).
  - `ticketText` → exatamente o template da referência (4 linhas, 40 hífens, saída), data `24/11/2026 14:32`.
  - `formatDuration(600)` → `0,6 s`; `12345` → `12,3 s`.
  - `initialValue` dos três casos.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit `feat: lógica pura da interface`.

---

### Task 7: Fronteira com o Rust + orquestração de execução (TS)

**Files:**
- Create: `src/lib/adb.ts`, `src/lib/runCommand.ts`, `src/lib/runCommand.test.ts`

**Interfaces:**
- Consumes: Tasks 3–6 (nomes dos comandos Tauri exatamente como acima), `buildCommand`.
- Produces:
  ```ts
  // adb.ts — wrappers finos de invoke/listen, sem lógica
  export const adb = { listDevices, runSteps, cancelRun, startStream, stopStream, listPackages, restartAdbServer, copyImageToClipboard, zipFolder, writeTextFile, openTerminal, adbVersion }
  // runCommand.ts
  export type RunEvent = { kind: 'started' } | { kind: 'lines'; lines: string[] } | { kind: 'done'; result: RunResult } | { kind: 'error'; message: string }
  export interface RunResult { output: string; exitCode: number; durationMs: number; savedTo?: string; display: string; at: Date }
  export function runCommand(c: Command, o: { device: DeviceInfo; value: string; baseDir: string; now: Date; runId: string }, api: typeof adb, emit: (e: RunEvent) => void): Promise<void>
  ```
  Regras: `modo` `terminal` → `api.openTerminal`; `continuo` → `startStream` (só 1º passo) e guarda `comando_parar`/`comando_depois` montados pra `stopRun`; `normal` → `runSteps`. Depois: `acao_extra 'copiar_imagem'` → `copyImageToClipboard(savedTo)`; `'zipar'` → `zipFolder(pasta do 1º redirect, '{d}\\diagnostico_{agora}.zip')`. Erro do montador (`BuildError`) → `emit({kind:'error', message})` sem chamar a API. `output` = stdouts + stderrs (stderr no fim).
- [ ] **Step 1: Testes que falham** com `api` falso (objeto com `vi.fn()` — é a fronteira com o Rust, mock aceitável): print chama `runSteps` e depois `copyImageToClipboard` com o `savedTo`; diag chama `zipFolder` com a subpasta `diagnostico_20261124_1432`; shell chama só `openTerminal`; logcontinuo chama `startStream`; valor vazio em `desinstalar` emite erro "Preencha o valor antes de executar." e não chama nada; exit 3 vira `done` com `exitCode 3`.
- [ ] **Step 2:** FAIL → implementar → PASS. Commit `feat: orquestração de execução`.

---

### Task 8: Interface – estrutura (topo, barra de ícones, lista, rodapé)

**Files:**
- Create: `src/App.tsx` (reescreve), `src/state/useAppState.ts`, `src/components/TopBar.tsx`, `Rail.tsx`, `CommandList.tsx`, `StatusBar.tsx`, `icons.tsx`, `*.css` por componente; testes `src/components/CommandList.test.tsx`, `TopBar.test.tsx`

**Interfaces:**
- Consumes: Tasks 6–7.
- Produces: `useAppState()` com `{ devices, selectedSerial, selectSerial, rail, setRail, search, setSearch, selectedCommandId, selectCommand, pinned, togglePin, baseDir, setBaseDir, status, flash(msg) }`. Polling `adb.listDevices` a cada 2 s; `pinned` e `baseDir` persistidos com `@tauri-apps/plugin-store` (`config.json`; padrão `C:\ADB-Suite\Saidas` e `fixados_padrao`). `flash` some em 3,5 s.

- [ ] **Step 1: Testes que falham** (testing-library, sem Tauri — `useAppState` recebe `api` injetável):
  - lista: digitar "apk" mostra título "Resultados", contagem e a categoria embaixo de cada item; clicar numa categoria limpa a busca; busca sem resultado mostra "Nenhum comando encontrado."; Fixados vazio mostra "Nada fixado. Abra um comando e clique em Fixar."; item com `pede_confirmacao` mostra "[!]".
  - topo: sem aparelhos mostra "Nenhum aparelho conectado"; aparelho `unauthorized` mostra o texto do Ruling 10; aparelho pronto mostra "Samsung Galaxy A54", "Android 14" e o serial.
- [ ] **Step 2:** FAIL → implementar (layout, cores e tamanhos da referência §1–§3 e §6; ícones SVG em linha reta conforme a tabela da §2) → PASS.
- [ ] **Step 3:** `npm run tauri dev` com um aparelho plugado: lista, busca, troca de categoria e rodapé com a pasta do aparelho. Commit `feat: estrutura da janela principal`.

---

### Task 9: Interface – comando, parâmetro, confirmação, comando livre e saída

**Files:**
- Create: `src/components/CommandView.tsx`, `ParamInput.tsx`, `ConfirmStrip.tsx`, `CommandBox.tsx`, `FreeCommand.tsx`, `OutputPanel.tsx` (+ css); testes `CommandView.test.tsx`, `OutputPanel.test.tsx`

**Interfaces:**
- Consumes: `useAppState`, `runCommand`, `appLogic`.
- Produces: tela completa da etapa 2. Saída contínua mantém só as últimas 5 000 linhas no painel.

- [ ] **Step 1: Testes que falham:**
  - `escolha` mostra cartões com a `pergunta` como legenda + cartão "Outro…" (ou `opcao_outro`) que, clicado, mostra o campo; sem `escolha` com atalhos mostra "Atalhos:" + chips que preenchem o campo.
  - `pede_confirmacao`: clicar Executar mostra `alertdialog` com "ATENÇÃO" e o texto exato; "Cancelar" fecha; "Sim, executar" chama `runCommand`.
  - Botão "▶ Executar no Galaxy A54"; sem aparelho fica desabilitado com "Conecte um aparelho"; executando vira "■ Parar".
  - Caixa do comando mostra `$ ` + `display`; "Copiar comando" → "Copiado ✓".
  - Painel: "aguardando" → "executando…" → "concluído em 0,6 s"; erro → "erro (código 3) em 0,6 s"; "Abrir pasta" só com `gera_arquivo` e após executar; "Copiar pro chamado" copia o `ticketText`.
  - Comando livre: Enter roda; vazio mostra "Digite um comando no campo livre."
  - resultado de execução antiga é ignorado: disparar A, trocar de aparelho e disparar B; o `done` de A chegando depois não altera o painel.
- [ ] **Step 2:** FAIL → implementar (referência §4–§5, Rulings 3, 6, 8, 9) → PASS. "Diagnosticar conexão" e "Coletar diagnóstico" no topo selecionam `conexao` e `diag`; em conflito de servidor (Task 4) o painel mostra o stderr e o botão "Reiniciar servidor adb".
- [ ] **Step 3:** Commit `feat: execução de comandos na interface`.

---

### Task 10: Validação ponta a ponta com aparelho real

**Files:** Modify: `README.md` (como rodar), `docs/superpowers/plans/2026-11-24-etapa2-app-tauri.md` (marcar checklist)

- [ ] **Step 1:** `npm test` (tudo verde), `cd src-tauri && cargo test` (tudo verde), `npm run build` sem erro.
- [ ] **Step 2:** `npm run tauri dev` com o celular do usuário plugado e **depuração autorizada**. Checklist (anotar resultado no ledger):
  - aparelho aparece com marca, modelo, Android e serial; desplugar some em ≤ 4 s;
  - Info do aparelho, Bateria, Foco atual → saída correta;
  - Extrair APK de `com.android.chrome` → `.apk` na pasta `<Marca>-<Modelo>_<SERIAL>`; "Abrir pasta" abre o Explorer;
  - Print → imagem no clipboard (colar no Paint) e PNG salvo;
  - Log contínuo → linhas aparecendo; Parar → arquivo `logAAAAMMDD_HHMM.txt` completo;
  - Gravar tela 5 s → Parar → `gravacao_*.mp4` toca;
  - Coletar diagnóstico → `diagnostico_*.zip` com 5 arquivos;
  - Shell → abre janela de terminal dentro do aparelho;
  - Comando livre `shell getprop ro.build.version.sdk` → número;
  - Desinstalar pacote inexistente → faixa ATENÇÃO e depois erro legível;
  - Copiar pro chamado → texto no template exato.
- [ ] **Step 3:** Commit `docs: como rodar o app` + push.
