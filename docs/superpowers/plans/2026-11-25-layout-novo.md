# Layout novo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a cara do app pelo sistema "Industrial Retro-Tech", com tela inicial de visão geral do aparelho e ícone novo, sem mudar o comportamento dos comandos.

**Architecture:** Os tokens CSS e as fontes locais mudam primeiro. Os componentes existentes (TopBar, Rail, CommandList, CommandView, OutputPanel, StatusBar) ganham marcação e CSS novos. Entra um componente `DeviceOverview` com um hook `useActivity` de log da sessão. A lógica nova fica em funções puras testadas (`lib/overview.ts`).

**Tech Stack:** React 19, TypeScript, Vitest + Testing Library, CSS puro, @fontsource (Inter, JetBrains Mono), Tauri CLI (`tauri icon`).

**Spec:** `docs/superpowers/specs/2026-11-25-layout-novo-design.md`

## Global Constraints
- Cores só pelos tokens do spec. Nada de hex solto nos componentes, exceto no SVG do ícone.
- Bordas de 1 px; cantos de 4 px em controles e 6 px em cards.
- Fontes locais (@fontsource), sem CDN.
- Textos de interface em pt-BR. Os nomes acessíveis usados pelos testes existentes continuam iguais, a não ser que a tarefa diga o contrário.
- Comandos continuam a 1 clique a partir do menu. Nenhuma mudança em `runCommand`, no `useRunner` ou no Rust.

## Review Focus
1. Aparelho "unauthorized" ou "offline" selecionado: o seletor e a visão geral mostram o estado certo, nunca "Conectado".
2. Janela estreita (960 px, o mínimo): menu só com ícones, arte do Android escondida, nada sobreposto.
3. Ctrl+K com o foco num input ou textarea (formulário) ainda foca a busca, e não digita "k".
4. Log de atividade com muitos eventos: guarda no máximo 50 e mostra os 8 mais recentes, sem crescer sem limite.
5. Seletor de aparelho com 0, 1 ou 3+ aparelhos: o menu abre e fecha (clique fora, Esc) e a troca chama `onSelect`.

---

### Task 1: Tokens, fontes e base global
**Files:** `package.json`, `src/styles/tokens.css`, `src/styles/global.css`, `docs/DESIGN.md`
- [ ] Instalar `@fontsource/inter` e `@fontsource/jetbrains-mono`. Remover `@fontsource/vt323`.
- [ ] Reescrever os tokens com a paleta do spec. Manter os nomes antigos usados no CSS como aliases enquanto as outras tarefas migram; remover os aliases na Task 7.
- [ ] global.css:
  - Inter 13 px;
  - `--fonte-tecnica` = JetBrains Mono, `--fonte-marca` = Space Mono;
  - `.terminal` usa a fonte técnica;
  - botões com 1 px de borda e raio de 4 px, `.btn-primario` roxo sólido;
  - `.secao-titulo` com `//` roxo.
- [ ] Reescrever o DESIGN.md com o sistema novo.
- [ ] Verificar: `npm test` todo verde e `npm run build` OK. Commit.

### Task 2: Ícone `[>>_]`, favicon e marca
**Files:** `assets/icone-app.svg`, `public/favicon.svg`, `index.html`, `src-tauri/icons/*`, `src/components/Brand.tsx`, `assets/android-neon.png`
- [ ] Criar o SVG do ícone: quadrado arredondado `#0D0D0D`, borda roxa, `>>` e `_` laranja.
- [ ] Gerar os ícones com `npx tauri icon assets/icone-app.svg`, depois apagar `android/` e `ios/`.
- [ ] Ligar o favicon no `index.html`.
- [ ] Copiar a arte do Android, redimensionada para 768 px de largura e mantendo a transparência.
- [ ] `Brand`: ícone, `[ ADB SUITE / M O B I L T E C ]` e `///`.
- [ ] Verificar o build. Commit.

### Task 3: Lógica da visão geral (pura, TDD)
**Files:** `src/lib/overview.ts`, `src/lib/overview.test.ts`
**Interfaces (Produces):**
- `transportOf(serial: string): 'USB' | 'Wi-Fi'` — Wi-Fi quando o serial bate com `/^[\d.]+:\d+$/` ou contém `._adb-tls-connect`.
- `deviceStatus(d: DeviceInfo | null): { tone: 'ok' | 'alerta' | 'erro' | 'vazio'; label: string }`:
  - `device` → `ok`, "Conectado";
  - `unauthorized` → `alerta`, "Não autorizado";
  - `offline` → `erro`, "Offline";
  - outro estado → `erro`, com o próprio estado;
  - `null` → `vazio`, "Sem aparelho".
- `interface ActivityEntry { at: Date; tag: 'ADB' | 'CMD' | 'ERRO'; text: string }`
- `deviceEvents(prev: DeviceInfo[], next: DeviceInfo[], at: Date): ActivityEntry[]`:
  - um serial novo, ou um estado que mudou para `device`, gera `ADB` "Aparelho conectado: <deviceName> (<serial>)";
  - um serial que sumiu gera `ADB` "Aparelho desconectado: <serial>";
  - um serial que virou `unauthorized` gera `ADB` "Aparelho aguardando autorização: <serial>".
- `pushActivity(list: ActivityEntry[], e: ActivityEntry[], max = 50): ActivityEntry[]` — mais recente primeiro, cortado em `max`.
- `formatClock(at: Date): string` — `HH:MM:SS`.
- [ ] Escrever os testes primeiro (cada regra acima, com o corte em 50), ver falhar, implementar, ver passar. Commit.

### Task 4: Barra superior com seletor de aparelho
**Files:** `src/components/TopBar.tsx`, `src/components/TopBar.test.tsx`, `src/components/icons.tsx`
**Behavior:**
- Botão "Aparelho" (nome acessível começa com o nome do aparelho, ou "Nenhum aparelho conectado") com `aria-haspopup="listbox"` e `aria-expanded`.
- Ao clicar, abre `role="listbox"` com um `role="option"` por aparelho (`aria-selected`). Clicar numa opção chama `onSelect(serial)` e fecha. Esc ou clique fora fecha.
- Aparelho não autorizado: o texto "SERIAL · não autorizado — confirme a depuração no aparelho" continua.
- [ ] Reescrever os testes:
  - sem aparelho;
  - mostra marca/modelo/Android/serial no botão;
  - abre a lista e troca de aparelho;
  - Esc fecha;
  - não autorizado;
  - os botões do topo chamam as ações.
- [ ] Ver falhar, implementar, ver passar. Commit.

### Task 5: Menu lateral e lista de comandos
**Files:** `src/components/Rail.tsx`, `src/components/CommandList.tsx` (+ test), `src/lib/appLogic.ts` (RAIL label), `src/App.tsx`, `src/state/useAppState.ts`
- RAIL: a chave `Fixados` passa a ter label "Início" e title "Comandos fixados". O título da lista passa a ser "Comandos fixados".
- O menu mostra ícone e label. Clicar em "Início" também desseleciona o comando (`selectCommand(null)`).
- CommandList:
  - título `//` + título + contagem com 2 dígitos ("05");
  - busca com ícone e `<kbd>Ctrl K</kbd>`;
  - itens com ícone da categoria e estrela `aria-label="Fixar <nome>"` / `"Desafixar <nome>"`, `aria-pressed`. A estrela chama `onTogglePin(id)` sem selecionar o item.
- Ctrl+K: um listener global em `App` foca `#busca` com `preventDefault`.
- [ ] Testes primeiro:
  - a estrela chama `onTogglePin` e não `onSelect`;
  - a contagem tem 2 dígitos;
  - `Ctrl+K` foca a busca (o teste fica em CommandList, com o listener no próprio componente via prop `focusShortcut`; a ruling no ledger explica onde ficou).
- [ ] Atualizar os testes de useAppState que esperam o título "Fixados". Commit.

### Task 6: Visão geral do aparelho e log de atividade
**Files:** `src/components/DeviceOverview.tsx` (+ test), `src/state/useActivity.ts` (+ test), `src/App.tsx`
**Interfaces:**
- `useActivity(): { entries: ActivityEntry[]; log(tag, text): void; trackDevices(list: DeviceInfo[]): void }`, que usa `deviceEvents` e `pushActivity`.
- `DeviceOverview` props: `{ device, deviceCount, entries, onDiagnose, onCollect, onInfo, onOpenFolder, flash }`.
**Behavior:**
- Sem aparelho: passo a passo ("Ative a Depuração USB…").
- Com aparelho: nome, serial com "Copiar serial", os 4 blocos e o selo de status (via `deviceStatus`).
- Ações rápidas chamam as props.
- "Última atividade" mostra até 8 entradas, `[HH:MM:SS] [TAG] texto`, ou "Nada ainda nesta sessão." quando vazio.
- App:
  - registra `[CMD]`/`[ERRO]` quando `runner.view` vira `done`/`error`, usando o nome do comando ou "Comando livre";
  - chama `trackDevices` a cada mudança de `s.devices`;
  - sem comando selecionado, mostra o `DeviceOverview`.
- [ ] Testes primeiro:
  - overview sem aparelho;
  - com aparelho (blocos, transporte USB, status);
  - não autorizado mostra "Não autorizado";
  - as ações chamam as props;
  - o log mostra no máximo 8.
- [ ] Teste de `useActivity`: `trackDevices` gera eventos; `log` empilha.
- [ ] Commit.

### Task 7: Tela de comando, saída, formulário e barra de status
**Files:** `src/components/CommandView.tsx`, `src/components/OutputPanel.tsx`, `src/components/CommandForm.tsx`, `src/components/StatusBar.tsx` (+ test novo), `src/styles/app.css`
- Restyle por CSS e marcação mínima. Os nomes acessíveis atuais continuam (os testes existentes provam).
- OutputPanel: título "saida.log" com `//`.
- StatusBar estilo IDE:
  - "N dispositivo(s) conectado(s)" com bolinha verde;
  - aparelho;
  - "Android N";
  - "ADB: OK" ou "ADB: erro" (nova prop `adbOk: boolean`, nova prop `device`);
  - mensagem;
  - "Pasta de saída:" com caminho, Alterar… e Abrir.
- Remover os aliases de token antigos.
- [ ] Teste novo de StatusBar: contagem no singular e no plural, "ADB: erro" quando `adbOk=false`, Alterar… salva. Commit.

### Task 8: Verificação visual e no aparelho
- [ ] Abrir o app (`npm run tauri dev`) e capturar só a janela:
  - sem aparelho;
  - com aparelho;
  - com um comando aberto e executado;
  - com o formulário;
  - em 960 px de largura.
- [ ] Corrigir sobreposições.
- [ ] `npm test`, `cargo test --lib` e `npm run build` verdes. Commit e ledger.
