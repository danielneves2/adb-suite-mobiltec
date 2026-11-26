# Janela compacta + atualização automática — plano

**Spec:** `docs/superpowers/specs/2026-11-26-janela-compacta-e-auto-update-design.md`

### Task 1: tamanhos da janela (`src/lib/settings.ts`)
- Teste: `WINDOW_SIZES` = `['livre','1120x630','1280x720','1440x900','1600x900','1920x1080']`; `parseWindowSize('900x520')` válido, `'899x520'` e `'900x519'` nulos; `fitWindowSizes({1280,672})` = `['livre','1120x630']`.
- Teste: `initialWindowSize(work)` → `null` quando 1120 × 630 + 40 cabe; senão `{min(1120, work.w), min(630, work.h-40)}` limitado por baixo a 900 × 520. Ex.: `{1093,576}` → `{1093,536}`; `{1000,540}` → `{1000,520}`; `{1920,1032}` e `{1280,672}` → `null`.
- `DEFAULT_WINDOW = {1120,630}`, `MIN = {900,520}` exportados; `tauri.conf.json`: width 1120, height 630, minWidth 900, minHeight 520, center true.

### Task 2: encaixe ao abrir (`src/lib/window.ts`, `src/App.tsx`)
- `fitWindow(w,h)` = setSize + center (Tauri). No App, na primeira aplicação do tamanho em "livre", se `initialWindowSize(work)` não for nulo, chama `fitWindow`.

### Task 3: atualização automática (`src/state/useUpdater.ts`)
- Opções novas: `installOnStart` e `recheckMs`.
- Testes: ao abrir com `installOnStart`, achou → instala e chama `relaunch`; install falha → estado `available` (botão volta); sem versão → idle.
- Testes: `recheckMs` → procura de novo em silêncio (fake timers) e só mostra `available` (não instala); não procura enquanto baixa/reinicia.
- App: `useUpdater(tauriUpdater, { autoCheck: true, installOnStart: true, recheckMs: 3_600_000 })`.

### Task 4: verificação e versão
- Suite inteira + `tsc`; layout conferido em 900 × 520 e 1120 × 630; versão 0.4.1 nos três arquivos.
