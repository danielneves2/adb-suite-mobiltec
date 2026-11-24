# Etapa 1 – Montador de comandos · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Função pura em TypeScript que transforma o texto de um comando do catálogo (ou o comando livre) em passos executáveis `{args, redirectTo}` pro adb embutido, mais o catálogo ajustado pra ser 100% dado executável.

**Architecture:** `src/lib/commandBuilder.ts` sem I/O: tokeniza cada linha respeitando aspas, troca placeholders por parte de token, injeta/troca o `-s`, extrai `> arquivo`. O Rust (etapa 2) recebe os passos e roda o sidecar com o vetor de args, sem `cmd.exe`. O catálogo (`data/catalog.json`) ganha os campos `modo`, `comando_parar`, `comando_depois`, `acao_extra`, e o `seed.sql` passa a ser gerado por script.

**Tech Stack:** Node 26, TypeScript 5 (strict), Vitest. Sem React nesta etapa (o scaffold do Tauri é a etapa 2 e vai incorporar este `package.json`).

**Spec:** `docs/superpowers/specs/2026-11-24-adb-suite-mvp-design.md` (seções 4, 5 e 11).

## Global Constraints
- Comandos são dados: nada de comando hardcoded fora de `data/catalog.json`/banco.
- Código e nomes técnicos em inglês; mensagens de erro mostradas ao técnico em português do Brasil.
- `grep` sempre dentro do aparelho; nunca `findstr`.
- Placeholders: `{s}` serial · `{p}` = `{pacote}` = `{arquivo}` = `{caminho}` = `{texto}` = `{pasta}` = valor · `{d}` pasta do aparelho · `{agora}` = `AAAAMMDD_HHMM` local · `{anterior}` fica literal (o Rust resolve).
- Subcomandos sem serial: `devices`, `kill-server`, `start-server`, `connect`, `disconnect`, `version`.
- Nenhum `.env*` nem binário do platform-tools no commit.

## Review Focus
1. Valor com espaço, `'`, `"`, `$`, `;`, `|` dentro de uma string entre aspas que vai pra shell do aparelho → chega como **uma palavra** no aparelho, sem executar nada extra. (Task 2, `shell quoting`)
2. Pasta do aparelho com espaço (`C:\ADB-Suite\Saidas\Samsung-Galaxy A10_R58M`) → um único arg / um único `redirectTo`. (Task 2)
3. Barra invertida de caminho Windows (`"{d}\{p}.apk"`) não é tratada como escape pelo tokenizador. (Task 1)
4. Comando vindo do banco com `\r\n` ou espaços sobrando → nenhum `\r` nos args, linhas vazias ignoradas. (Task 1)
5. Comando livre com `adb -s OUTRO …` → serial trocado pelo selecionado; `adb devices` não ganha `-s`. (Task 3)

---

### Task 1: Setup do projeto TS + tokenizador

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `src/lib/tokenize.ts`
- Test: `src/lib/tokenize.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface TokenPart { text: string; quoted: boolean }
  export type Token = TokenPart[]               // partes concatenadas = um arg
  export function splitLines(template: string): string[]   // trim, remove \r, descarta vazias
  export function tokenize(line: string): Token[]           // lança BuildError('unbalanced-quotes')
  export class BuildError extends Error { constructor(public code: BuildErrorCode, message: string) }
  export type BuildErrorCode = 'unbalanced-quotes' | 'missing-value' | 'unknown-placeholder' | 'empty'
  ```

- [ ] **Step 1: Setup.** `package.json` com `"name": "adb-suite-mobiltec"`, `"private": true`, `"type": "module"`, script `"test": "vitest run"`; devDeps `typescript`, `vitest`. `tsconfig.json` com `strict: true`, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `noEmit: true`. Rodar `npm install`. Conferir que `node_modules/` está no `.gitignore` (já está).

- [ ] **Step 2: Testes que falham** em `src/lib/tokenize.test.ts`:
  ```ts
  test('separa por espaço', () => expect(texts(tokenize('adb shell wm size'))).toEqual(['adb','shell','wm','size']))
  test('aspas duplas agrupam e somem', () => expect(texts(tokenize('adb shell "pm list packages | grep x"'))).toEqual(['adb','shell','pm list packages | grep x']))
  test('aspas simples agrupam', () => expect(texts(tokenize("a 'b c'"))).toEqual(['a','b c']))
  test('aspa simples dentro de duplas é literal', () => expect(texts(tokenize(`a "grep -A2 'Device Owner'"`))).toEqual(['a',"grep -A2 'Device Owner'"]))
  test('barra invertida é literal', () => expect(texts(tokenize('pull x "{d}\\{p}.apk"'))).toEqual(['pull','x','{d}\\{p}.apk']))
  test('partes marcam quoted', () => expect(tokenize('--x="a b"c')[0]).toEqual([{text:'--x=',quoted:false},{text:'a b',quoted:true},{text:'c',quoted:false}]))
  test('aspas sem fechar', () => expect(() => tokenize('a "b')).toThrow(expect.objectContaining({code:'unbalanced-quotes'})))
  test('splitLines limpa CRLF e vazias', () => expect(splitLines('a\r\n\r\n  b  \n')).toEqual(['a','b']))
  ```
  (`texts` = helper local que junta as partes de cada token.)

- [ ] **Step 3:** `npm test` → FAIL (módulo não existe).

- [ ] **Step 4: Implementar** `splitLines`, `tokenize`, `BuildError` em `src/lib/tokenize.ts`. Máquina de estados simples (fora / dentro de `"` / dentro de `'`); sem escape por barra invertida. Mensagem do `unbalanced-quotes`: `"Aspas sem fechar no comando."`.

- [ ] **Step 5:** `npm test` → PASS.

- [ ] **Step 6: Commit** `feat: tokenizador de comandos` (package.json, package-lock.json, tsconfig, vitest.config, src/lib/tokenize*).

---

### Task 2: `buildCommand` (placeholders, serial, redirecionamento, aspas da shell)

**Files:**
- Create: `src/lib/commandBuilder.ts`
- Test: `src/lib/commandBuilder.test.ts`

**Interfaces:**
- Consumes: `splitLines`, `tokenize`, `Token`, `BuildError` (Task 1).
- Produces:
  ```ts
  export interface BuildContext { serial: string; value?: string; deviceDir: string; now: Date }
  export interface Step { args: string[]; redirectTo?: string; usesPrevious: boolean }
  export interface BuildResult { steps: Step[]; display: string }   // display: linhas "adb -s X …" separadas por \n
  export interface BuildOptions { requiresValue?: boolean; freeMode?: boolean }
  export function buildCommand(template: string, ctx: BuildContext, opts?: BuildOptions): BuildResult
  export function formatTimestamp(d: Date): string   // "20261124_1432"
  export const NO_SERIAL_SUBCOMMANDS: readonly string[]
  ```
  `args` **não** inclui o executável `adb`; começa em `-s` ou no subcomando.

Regras (spec §4, com refinamento das aspas — ver Step 4):
1. Por linha: tokeniza → remove 1º token se for `adb`, `adb.exe`, `.\adb`, `./adb`, `.\adb.exe` → troca placeholders → serial → redirecionamento.
2. Serial: se `args[0] === '-s'`, troca `args[1]` pelo `ctx.serial`; senão, se `args[0]` ∈ `NO_SERIAL_SUBCOMMANDS`, nada; senão prefixa `['-s', serial]`.
3. Último token `>` sem aspas seguido de exatamente 1 token → `redirectTo` = esse token; ambos saem de `args`.
4. `freeMode: true` não interpreta placeholders (texto livre do técnico vai literal).
5. `{anterior}` fica literal no arg e marca `usesPrevious: true`.
6. Erros: template sem linhas → `empty` ("Comando vazio."); `requiresValue` ou template contendo `{p}`/alias com `value` vazio/só espaço → `missing-value` ("Preencha o valor antes de executar."); `{qualquer}` desconhecido → `unknown-placeholder` ("Marcador desconhecido: {x}.").

- [ ] **Step 1: Testes que falham** (contexto padrão `ctx = {serial:'R58M', value:'br.com.x', deviceDir:'C:\\ADB-Suite\\Saidas\\Samsung-A10_R58M', now:new Date(2026,10,24,14,32,5)}`):
  ```ts
  test('injeta -s', () => expect(build('adb shell wm size').steps[0].args).toEqual(['-s','R58M','shell','wm','size']))
  test('troca {s} e mantém -s', () => expect(build('adb -s {s} shell pm path {p}').steps[0].args).toEqual(['-s','R58M','shell','pm','path','br.com.x']))
  test('aliases', () => expect(build('adb uninstall {pacote}').steps[0].args).toEqual(['-s','R58M','uninstall','br.com.x']))
  test('sem serial', () => { expect(build('adb devices -l').steps[0].args).toEqual(['devices','-l']); expect(build('adb kill-server').steps[0].args).toEqual(['kill-server']) })
  test('agora', () => expect(formatTimestamp(ctx.now)).toBe('20261124_1432'))
  test('redirect com pasta com espaço', () => { const s = build('adb -s {s} logcat -d > "{d}\\log{agora}.txt"', {...ctx, deviceDir:'C:\\X\\Samsung-Galaxy A10_R58M'}).steps[0]; expect(s.args).toEqual(['-s','R58M','logcat','-d']); expect(s.redirectTo).toBe('C:\\X\\Samsung-Galaxy A10_R58M\\log20261124_1432.txt') })
  test('pull com {d} vira 1 arg', () => expect(build('adb pull "{p}" "{d}"', {...ctx, value:'/sdcard/Meus arquivos/a.txt'}).steps[0].args).toEqual(['-s','R58M','pull','/sdcard/Meus arquivos/a.txt','C:\\ADB-Suite\\Saidas\\Samsung-A10_R58M']))
  test('multilinha + anterior', () => { const r = build('adb shell pm path {p}\nadb pull {anterior} "{d}\\{p}.apk"'); expect(r.steps).toHaveLength(2); expect(r.steps[1].usesPrevious).toBe(true); expect(r.steps[1].args).toContain('{anterior}') })
  test('display', () => expect(build('adb shell "pm list packages | grep {p}"').display).toBe('adb -s R58M shell "pm list packages | grep br.com.x"'))
  test('valor vazio', () => expect(() => build('adb uninstall {p}', {...ctx, value:'  '})).toThrow(expect.objectContaining({code:'missing-value'})))
  test('requiresValue sem {p}', () => expect(() => build('adb shell ls', {...ctx, value:''}, {requiresValue:true})).toThrow(expect.objectContaining({code:'missing-value'})))
  test('marcador desconhecido', () => expect(() => build('adb shell {xyz}')).toThrow(expect.objectContaining({code:'unknown-placeholder'})))
  test('vazio', () => expect(() => build(' \r\n ')).toThrow(expect.objectContaining({code:'empty'})))
  // shell quoting (Review Focus 1)
  test('valor em parte entre aspas vira 1 palavra na shell', () => expect(build('adb shell input text "{p}"', {...ctx, value:"it's $HOME; ls"}).steps[0].args.at(-1)).toBe(`'it'\\''s $HOME; ls'`))
  test('valor seguro não ganha aspas', () => expect(build('adb shell "pm list packages | grep {p}"').steps[0].args.at(-1)).toBe('pm list packages | grep br.com.x'))
  test('placeholder sem aspas vai cru (grant com 2 palavras)', () => expect(build('adb shell pm grant {p}', {...ctx, value:'br.com.x android.permission.CAMERA'}).steps[0].args.at(-1)).toBe('br.com.x android.permission.CAMERA'))
  test('args fora da shell nunca levam aspas de sh', () => expect(build('adb install -r "{p}"', {...ctx, value:"C:\\Downloads\\app d'x.apk"}).steps[0].args.at(-1)).toBe("C:\\Downloads\\app d'x.apk"))
  ```
  (`build(t, c = ctx, o?)` = `buildCommand(t, c, o)`.)

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Implementar** `buildCommand`, `formatTimestamp`, `NO_SERIAL_SUBCOMMANDS` em `src/lib/commandBuilder.ts`. `formatTimestamp` usa horário local, zero à esquerda.

- [ ] **Step 4: Regra das aspas da shell (refina o §11 do spec; atualizar a linha do spec nesse commit).** Vale só para args que vêm **depois** do token `shell`: quando um placeholder de valor (`{p}` e aliases) está numa parte `quoted: true` e o valor não casa `/^[A-Za-z0-9._\-\/:=@%+,]+$/`, insere `'` + valor com `'` → `'\''` + `'`. Parte sem aspas → valor cru (o técnico quis várias palavras). Fora da shell (install, pull, push, redirect) → sempre cru, porque vai como argv sem shell. `display` reaplica aspas duplas em args com espaço, `|`, `'`, `$`, `;` ou `>`.

- [ ] **Step 5:** `npm test` → PASS.

- [ ] **Step 6: Commit** `feat: montador de comandos com placeholders, serial e redirecionamento` (+ linha do spec §11 trocada para "insere o valor entre aspas simples de sh (`'` → `'\''`) quando a parte era entre aspas e o valor tem caractere especial").

---

### Task 3: Comando livre

**Files:**
- Modify: `src/lib/commandBuilder.ts`
- Test: `src/lib/commandBuilder.test.ts` (bloco `describe('comando livre')`)

**Interfaces:**
- Consumes: `buildCommand` (Task 2).
- Produces: `export function buildFreeCommand(input: string, ctx: Omit<BuildContext,'value'>): BuildResult` — prefixa `adb ` quando o 1º token não for uma variante de adb e chama `buildCommand(…, {freeMode:true})`.

- [ ] **Step 1: Testes que falham:**
  ```ts
  test('shell …', () => expect(free('shell ls /sdcard').steps[0].args).toEqual(['-s','R58M','shell','ls','/sdcard']))
  test('adb shell …', () => expect(free('adb shell ls').steps[0].args).toEqual(['-s','R58M','shell','ls']))
  test('.\\adb shell …', () => expect(free('.\\adb shell ls').steps[0].args).toEqual(['-s','R58M','shell','ls']))
  test('adb -s OUTRO troca pelo selecionado', () => expect(free('adb -s ZZZ999 shell ls').steps[0].args).toEqual(['-s','R58M','shell','ls']))
  test('adb devices sem -s', () => expect(free('adb devices').steps[0].args).toEqual(['devices']))
  test('chaves ficam literais', () => expect(free('shell echo {x}').steps[0].args.at(-1)).toBe('{x}'))
  test('> arquivo funciona no livre', () => expect(free('shell getprop > "C:\\t\\p.txt"').steps[0].redirectTo).toBe('C:\\t\\p.txt'))
  ```

- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implementar. **Step 4:** `npm test` → PASS.

- [ ] **Step 5: Commit** `feat: normalização do comando livre`.

---

### Task 4: Catálogo como dado executável + migração + seed gerado

**Files:**
- Create: `src/lib/catalogTypes.ts`
- Modify: `data/catalog.json` (`versao: 2`)
- Create: `db/002_mvp.sql`
- Create: `scripts/gerar-seed.mjs`; Modify (regenerado): `db/seed.sql`
- Test: `src/lib/catalog.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ParamKind = 'pkg' | 'apk' | 'file' | 'path' | 'text'
  export type CommandMode = 'normal' | 'continuo' | 'terminal'
  export type ExtraAction = 'copiar_imagem' | 'zipar'
  export interface Shortcut { rotulo: string; valor: string }
  export interface Command {
    id: string; categoria: string; nome: string; resumo: string; comando: string
    parametro: ParamKind | null; rotulo_parametro?: string | null; exemplo?: string | null
    atalhos?: Shortcut[] | null; escolha?: { pergunta: string; opcao_outro: string | null } | null
    pede_confirmacao?: boolean; texto_confirmacao?: string | null; gera_arquivo?: boolean
    modo?: CommandMode; comando_parar?: string | null; comando_depois?: string | null; acao_extra?: ExtraAction | null
    saida_exemplo?: string; oficial?: boolean; excluido?: boolean; atualizado_em?: string
  }
  export interface Catalog { versao: number; categorias: string[]; fixados_padrao: string[]; pacotes_sugeridos: string[]; comandos: Command[] }
  ```
  (nomes de campo em português porque espelham as colunas do banco.)

- [ ] **Step 1: Testes que falham** em `src/lib/catalog.test.ts` (importa `data/catalog.json`):
  ```ts
  test('46 comandos', () => expect(catalog.comandos).toHaveLength(46))
  test.each(catalog.comandos)('$id monta sem erro', c => { const r = buildCommand(c.comando, {...ctx, value: c.exemplo ?? 'x'}, {requiresValue: c.parametro !== null}); expect(r.steps.length).toBeGreaterThan(0); for (const extra of [c.comando_parar, c.comando_depois]) if (extra) buildCommand(extra, ctx) })
  test('sem data fixa nem <…>', () => { for (const c of catalog.comandos) { expect(c.comando).not.toMatch(/\d{8}_\d{4}|\d{4}-\d{2}-\d{2}|<[^>]+>|192\.168\./); } })
  test('nenhum findstr', () => expect(JSON.stringify(catalog)).not.toMatch(/findstr/i))
  test('modos', () => { expect(byId('logcontinuo').modo).toBe('continuo'); expect(byId('gravar').modo).toBe('continuo'); expect(byId('shell').modo).toBe('terminal') })
  test('ações extras', () => { expect(byId('print').acao_extra).toBe('copiar_imagem'); expect(byId('diag').acao_extra).toBe('zipar') })
  test('extrair usa {anterior}', () => expect(buildCommand(byId('extrair').comando, ctx).steps[1].usesPrevious).toBe(true))
  test('diag grava em subpasta', () => expect(byId('diag').comando).toMatch(/\{d\}\\diagnostico_\{agora\}\\/))
  test('wifi pede IP', () => { expect(byId('wifi').parametro).toBe('text'); expect(byId('wifi').comando).toContain('adb connect {p}:5555') })
  ```

- [ ] **Step 2:** `npm test` → FAIL.

- [ ] **Step 3: Editar `data/catalog.json`** exatamente conforme spec §5 e §11:
  - `print`: `adb -s {s} exec-out screencap -p > "{d}\screenshot_{agora}.png"`, `acao_extra: "copiar_imagem"`.
  - `logcontinuo`: `… > "{d}\log{agora}.txt"`, `modo: "continuo"`. `logsalvar`: `… > "{d}\log{agora}.txt"`.
  - `bugreport`: `adb -s {s} bugreport "{d}\bugreport_{agora}.zip"`.
  - `extrair` linha 2: `adb -s {s} pull {anterior} "{d}\{p}.apk"`.
  - `logcat`: `adb -s {s} shell "logcat -v threadtime --pid=$(pidof {p})"`.
  - `wifi`: `parametro: "text"`, `rotulo_parametro: "IP do aparelho"`, `exemplo: "192.168.0.10"`, linha 2 `adb connect {p}:5555`, resumo citando onde ver o IP (Configurações → Wi‑Fi).
  - `shell`: `modo: "terminal"`.
  - `gravar`: `modo: "continuo"`, `comando_parar: "adb -s {s} shell pkill -INT screenrecord"`, `comando_depois: "adb -s {s} pull /sdcard/gravacao.mp4 \"{d}\\gravacao_{agora}.mp4\""`.
  - `diag`: todos os `{d}\x` viram `{d}\diagnostico_{agora}\x`; `acao_extra: "zipar"`.
  - `saida_exemplo` que citem os nomes antigos: atualizar o nome do arquivo pro novo padrão.
  - `versao: 2`.

- [ ] **Step 4: `db/002_mvp.sql`** (idempotente):
  ```sql
  alter table comandos add column if not exists modo text not null default 'normal';
  alter table comandos add column if not exists comando_parar text;
  alter table comandos add column if not exists comando_depois text;
  alter table comandos add column if not exists acao_extra text;
  -- checks via DO-block com "if not exists" em pg_constraint:
  --   comandos_modo_check: modo in ('normal','continuo','terminal')
  --   comandos_acao_extra_check: acao_extra is null or acao_extra in ('copiar_imagem','zipar')
  alter table usuarios drop column if exists email;
  alter table usuarios drop column if exists senha_hash;
  create unique index if not exists usuarios_nome_lower_idx on usuarios (lower(nome));
  ```

- [ ] **Step 5: `scripts/gerar-seed.mjs`**: lê `data/catalog.json`, escreve `db/seed.sql` no mesmo formato do atual (comentário de cabeçalho, um `insert … values` com todas as colunas do schema + as 4 novas, `oficial = true`, strings com `'` → `''`, jsonb como `'…'::jsonb`, `on conflict (id) do nothing;`). Rodar `node scripts/gerar-seed.mjs` e conferir com `git diff db/seed.sql` que as datas fixas sumiram e as colunas novas apareceram.

- [ ] **Step 6:** `npm test` → PASS (todos os testes das Tasks 1–4).

- [ ] **Step 7: Commit + push** `feat: catálogo v2 executável, migração 002 e seed gerado` e depois `git push` (confirmar antes que `git status` não lista `.env*`).
