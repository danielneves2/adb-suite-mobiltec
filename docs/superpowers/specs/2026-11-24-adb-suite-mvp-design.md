# ADB Suite – Mobiltec · Design do MVP

Data: 2026-11-24 · Status: rascunho para aprovação

Complementa (não repete) `CLAUDE.md`, `docs/MVP.md`, `docs/DESIGN.md`, `docs/NEON-SETUP.md` e o protótipo em `prototype/`. Onde este documento e o CLAUDE.md divergirem, vale o CLAUDE.md, exceto nos ajustes de catálogo marcados aqui como **mudança**.

## 1. Intenção
Técnicos de suporte da Mobiltec (não devs, Windows) rodam comandos ADB o dia todo copiando de anotações. O app junta esses comandos num catálogo clicável, roda no aparelho certo, guarda a saída na pasta certa e deixa qualquer técnico cadastrar um comando novo que chega pro time inteiro.

**Sucesso:** um técnico instala o app, pluga um aparelho e extrai um APK / salva um log / copia a saída pro chamado sem abrir terminal nem instalar adb.

**Não-objetivos (MVP):** rodar em vários aparelhos de uma vez, adb antigo pro Android 5.1, histórico de execuções, restrição de domínio no cadastro, auto-update do app, macOS/Linux.

**Anti-objetivos:** comando hardcoded em componente; saída de aparelho (log, serial, bugreport) subindo pra nuvem; `DATABASE_URL` no app desktop; depender do adb do PATH; o técnico perder um comando por exclusão.

## 2. Abordagens consideradas
| Abordagem | Troca | Decisão |
|---|---|---|
| **Monorepo: app Tauri + `server/` Vercel + `db/`** | um lugar só, `atualizar.bat` cobre tudo | **escolhida** |
| Repos separados app / API | isolamento que um time pequeno não precisa, dobra o trabalho de sync | descartada |
| API em servidor interno | controle total, mas alguém mantém e só funciona na rede | descartada (usuário escolheu Vercel) |
| Driver `pg` com conexão TCP | ruim em funções serverless (conexão por chamada) | descartado; usa `@neondatabase/serverless` (HTTP) |

## 3. Arquitetura
```
App desktop (Tauri 2)                         Vercel                    Neon
┌───────────────────────────┐   HTTPS+chave  ┌──────────────┐  HTTP    ┌──────────┐
│ React/TS (UI, montador,   │ ────────────▶ │ server/api    │ ───────▶ │ Postgres │
│ sync, cache)              │               │ (Node)       │          │ production│
│ Rust: run_adb, stream,    │               └──────────────┘          └──────────┘
│ devices, clipboard, zip   │
│ sidecar: adb.exe + DLLs   │
└───────────────────────────┘
```

### 3.1 Estrutura de pastas
```
src/                    React + TS
  lib/commandBuilder.ts montador (puro, testado)
  lib/commandBuilder.test.ts
  lib/sync.ts           polling + cache
  lib/api.ts            cliente da API
  components/…          telas conforme protótipo
src-tauri/              Rust
  binaries/             adb-x86_64-pc-windows-msvc.exe (+ DLLs como resource) — fora do git
  src/adb.rs            execução e streaming
  src/devices.rs        detecção
scripts/baixar-platform-tools.ps1   baixa o platform-tools oficial do Google e coloca em binaries/
server/                 projeto Vercel (Root Directory): package.json + api/*.ts
db/                     schema.sql, seed.sql (+ migração do item 5)
```

## 4. Montador de comandos (`commandBuilder.ts`)
Função pura, sem I/O. Entrada: modelo do comando (texto multilinha), contexto `{serial, valor, pastaAparelho, agora}`. Saída: lista de **passos**, cada um `{args: string[], redirecionarPara?: string}`, mais o texto legível pro "Ver comando adb".

Regras:
1. Cada linha = um passo. Linhas vazias ignoradas.
2. **Tokeniza antes de substituir**: separa por espaço respeitando aspas duplas e simples; só depois troca placeholders dentro de cada token. Assim um valor com espaço (ex.: texto digitado, caminho com espaço) nunca quebra o argumento. Nada passa por `cmd.exe`: o Rust chama o adb com o vetor de args.
3. Primeiro token `adb` (ou `.\adb`, `adb.exe`) é removido — o executor sempre usa o sidecar.
4. Injeção de serial: se não houver `-s X` depois de `adb`, injeta `-s <serial>`; se houver (comando livre), **troca** pelo serial selecionado. Exceções sem serial: `devices`, `kill-server`, `start-server`, `connect`, `disconnect`, `version`.
5. Comando livre aceita `shell …`, `adb shell …`, `.\adb shell …`, `adb -s X …` → normaliza para `adb -s <selecionado> …`.
6. `> "arquivo"` no fim da linha vira `redirecionarPara` (o Rust grava o stdout em binário no arquivo — necessário pro `screencap -p`).
7. Placeholders: `{s}` serial · `{p}` e os aliases do time `{pacote} {arquivo} {caminho} {texto} {pasta}` = valor do parâmetro · `{d}` pasta do aparelho · **novos**: `{agora}` = `AAAAMMDD_HHMM` no horário local · `{anterior}` = saída do passo anterior (ver 5).
8. Placeholder desconhecido ou `{p}` vazio quando o comando pede parâmetro → erro de validação antes de rodar (botão Executar desabilitado com a mensagem).
9. `{d}` inexistente é criado pelo Rust antes de rodar.

Testes unitários (Vitest) cobrem: cada placeholder, valores com espaço/aspas, injeção e troca do `-s`, as 4 formas do comando livre, exceções sem serial, redirecionamento, multilinha, `{anterior}`, erros de validação, e os 46 comandos do catálogo montando sem erro.

## 5. Ajustes no catálogo (**mudança** em `catalog.json`, `seed.sql` e schema)
O catálogo atual tem trechos que não são dados executáveis. Ajustes:

| Comando | Hoje | Passa a ser |
|---|---|---|
| print, logcontinuo, logsalvar, bugreport | data fixa no nome (`log20261124_1432.txt`) | `log{agora}.txt`, `screenshot_{agora}.png`, `bugreport_{agora}.zip` |
| extrair | `pull <caminho>` | `pull {anterior} "{d}\{p}.apk"`; `{anterior}` = 1ª linha da saída anterior sem o prefixo `package:` (APK base; split APKs fora do MVP) |
| logcat (por app) | `--pid=<pid de {p}>` | `adb shell "logcat -v threadtime --pid=$(pidof {p})"` — resolve no aparelho, sem lógica no app |
| wifi | IP fixo `192.168.0.143` | parâmetro `text` "IP do aparelho"; linha 2 `adb connect {p}:5555` |
| shell | `adb shell` interativo | `modo: "terminal"`: abre uma janela de terminal do Windows já com o adb do app no PATH dessa janela |
| logcontinuo, gravar | rodam até parar | `modo: "continuo"` (streaming com **Parar**) |
| gravar | grava em `/sdcard` e fica lá | `comando_parar: adb shell pkill -INT screenrecord` e linha pós-parada `adb pull /sdcard/gravacao.mp4 "{d}\gravacao_{agora}.mp4"` |

Novas colunas em `comandos` (migração `db/002_modo.sql`): `modo text not null default 'normal' check (modo in ('normal','continuo','terminal'))`, `comando_parar text`, `comando_depois text`. O formulário de cadastro do time **não** expõe essas colunas no MVP (comandos do time são sempre `normal`).

## 6. Execução (Rust)
Comandos Tauri:
- `run_steps(steps) -> [{stdout, stderr, exit_code, duracao_ms}]`: roda passos em sequência, para no primeiro erro, resolve `{anterior}` entre passos. Timeout padrão 120 s (bugreport: sem timeout, com Parar).
- `start_stream(steps) -> id` + evento `stream-output` (linhas) + `stop_stream(id)`: para logcat contínuo e screenrecord. Parar mata o processo local e, se houver `comando_parar`, roda ele antes; depois roda `comando_depois`. Logcat contínuo grava em arquivo **e** mostra no painel (painel limitado às últimas ~5 000 linhas).
- `list_devices()`: `adb devices -l` + `getprop` (marca, modelo, Android) por serial; o front chama a cada 2 s. Estados `unauthorized`/`offline` aparecem na lista com aviso ("Autorize a depuração no aparelho").
- `screenshot_to_clipboard(serial, path)`: grava o PNG e copia a imagem (crate `arboard`).
- `collect_diagnostic(serial)`: roda os passos do comando `diag` e zipa a pasta resultante em `diagnostico_{agora}.zip` (crate `zip`).
- `open_terminal(serial)`, `open_folder(path)`.
- Saída decodificada como UTF-8 com substituição de bytes inválidos.

adb sidecar: `adb.exe` como `externalBin`; `AdbWinApi.dll` e `AdbWinUsbApi.dll` como `resources` na mesma pasta. O app sobe o servidor adb na porta padrão; se já houver outro adb de versão diferente rodando na máquina, mostra o aviso do "Diagnosticar conexão" com botão para reiniciar o servidor. Drivers USB de fabricante ficam fora do app.

## 7. API (Vercel)
**Decisão do usuário: login é só nome de usuário** — sem e-mail, sem senha. Na primeira abertura o técnico digita o nome; o app guarda e nunca mais pede (trocar em "Sair").

Projeto Vercel separado do app dentro do mesmo repo: pasta `server/` (com `package.json` próprio e `server/api/*.ts`), **Root Directory = `server`** no projeto da Vercel, framework "Other", sem build do app desktop. Deploy automático a cada push na `main`. Node + TypeScript, `@neondatabase/serverless` (`neon()` HTTP), `zod`.

Variáveis na Vercel: `DATABASE_URL` (connection string *pooled* da branch `production`, copiada do console do Neon — não usamos a integração do Marketplace porque o projeto Neon já existe na org) e `APP_KEY`.

Toda chamada manda `X-App-Key` (chave embutida no build do app; barra robôs e curiosos, não é segurança forte — aceito, exclusão é lógica) e `X-Usuario: <nome>`.

| Método/rota | Faz |
|---|---|
| `POST /api/entrar` `{nome}` | cria o usuário se não existir (nome único, sem diferenciar maiúsculas, 2–40 caracteres) → `{usuario}` |
| `GET /api/comandos?desde=<iso>` | linhas com `atualizado_em > desde` (inclui excluídas) + `servidor_agora` |
| `POST /api/comandos` | cria (id uuid, `oficial=false`, `criado_por`) |
| `PUT /api/comandos/:id` | edita qualquer comando, inclusive oficial (`atualizado_por`) |
| `DELETE /api/comandos/:id` | `excluido=true` |

Schema: `usuarios` passa a ter só `id`, `nome` (unique, `lower(nome)`), `criado_em` — migração `db/002` remove `email` e `senha_hash`. Banco guarda só o nome de quem editou.

## 8. Sincronização e dados locais
- Arquivos no diretório de dados do app (`tauri-plugin-store`): `catalogo.json` (cache completo), `config.json` (pasta de saída, último sync, fixados, nome do usuário).
- Primeira execução sem rede: usa o `catalog.json` embutido no build.
- Polling a cada 30 s: `GET /comandos?desde=<ultimo_sync>`; aplica upsert/remoção no cache; `ultimo_sync = servidor_agora` (relógio do servidor, não da máquina).
- Conflito: última gravação vence.
- Criar/editar/excluir exige estar online; offline os botões mostram "Sem conexão — o catálogo continua funcionando".
- Fixados ficam só na máquina (MVP.md item 6).

## 9. Interface
Segue `docs/DESIGN.md` e o protótipo (layout, cores, fontes Space Mono e VT323 embutidas no app, sem CDN). Componentes reais em React; o HTML do protótipo é só referência. Primeira abertura: uma tela só, "Seu nome" + **Entrar**. Sem rede, entra mesmo assim (usa o catálogo embutido) e registra o nome na API quando a conexão voltar.

## 10. Entregas (um commit + `atualizar.bat` por etapa)
1. Montador de comandos + testes + ajustes do catálogo (item 5).
2. App Tauri: layout, catálogo local, aparelhos, execução normal/streaming/terminal, pasta de saída, copiar/salvar/copiar pro chamado, fixados, screenshot, diagnóstico.
3. Neon (schema + migração + seed) e API na Vercel, com teste ponta a ponta do NEON-SETUP.
4. Login, formulário de comando, sincronização e cache offline.
5. Instalador Windows (NSIS via `tauri build`), distribuído manualmente.

## 11. Decisões tomadas por mim (corrija se discordar)
- Pasta de saída criada sob demanda; nome `<Marca>-<Modelo>_<SERIAL>` com caracteres inválidos do Windows trocados por `_`.
- Qualquer técnico logado edita qualquer comando, inclusive os oficiais (exclusão é lógica, então nada se perde).
- Polling de aparelhos a cada 2 s.
- Instalador sem auto-update no MVP.
- **Comportamentos extras são dados**: coluna `acao_extra text check (acao_extra in ('copiar_imagem','zipar'))` na migração 002. `print` → `copiar_imagem`; `diag` → `zipar`. Autocomplete de pacote liga por `parametro = 'pkg'`. A UI nunca decide pelo `id`.
- **`diag`** grava numa subpasta `{d}\diagnostico_{agora}\` e o zip é só dela (`diagnostico_{agora}.zip` em `{d}`).
- **Valor dentro de aspas da shell do aparelho**: quando o token começa com `shell` e o placeholder cai dentro de uma string entre aspas duplas, o montador escapa `\ " $ \`` com barra invertida. Testado com `"`, `$`, `;`, espaço.
- **Colisão de nomes**: logs seguem `logAAAAMMDD_HHMM.txt`; se o arquivo já existir, o Rust acrescenta `_2`, `_3`… (vale pra print, bugreport, gravação).
- **Seed** usa `on conflict (id) do nothing`: rodar de novo nunca sobrescreve edição do time. Correção futura num oficial vai como migração explícita (`update … where id = …`), que dispara `atualizado_em` e chega a todos pelo sync.
- **Diagnosticar conexão**: checa servidor adb respondendo, versão do adb em uso, aparelhos `unauthorized`/`offline`/nenhum (com dica de cabo, modo de transferência, driver do fabricante e "autorize a depuração").
- **Instalador sem assinatura** no MVP: instrução pros técnicos ("Mais informações → Executar assim mesmo" no SmartScreen). Assinar fica pra quando houver certificado.
