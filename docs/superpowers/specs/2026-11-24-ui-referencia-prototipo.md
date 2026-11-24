# Referência de UI – protótipo da janela principal

Fonte: `prototype/prototipo-janela-principal.dc.html` (aprovado). Este documento basta para implementar em React sem abrir o protótipo. Textos entre aspas são **exatos** (pt-BR). Cores = tokens de `docs/DESIGN.md`; hex fora da tabela do DESIGN vêm marcados com *(extra)*. Todos os cantos são retos (radius 0). Fonte de UI Space Mono 12 px; terminal VT323.

Convenções: "botão secundário" = 2 px borda `#322F37`, fundo `#1F1D22`, texto `#EDEAEE`, bold. "Botão primário" = borda e fundo `#7B0A5D`, texto `#FFF`, bold. "Rótulo" = 10 px bold, caixa alta, `letter-spacing .08em`, `#A9A4AE`.

## 1. Topo (`header`)
Fundo `#0E0D10`, borda inferior 3 px `#7B0A5D`, padding 8×16, `flex-wrap`, gap 10/20.
- Logo 30×30 + "ADB SUITE **-** MOBILTEC" (15 px bold; o "-" em `#A9A4AE` peso 400) + "v0.1" (10 px `#ADA7B2`).
- Rótulo "APARELHO" + um botão por aparelho (altura 32, padding 0 10, gap 8):
  - selecionado: fundo `#2E2B33`, borda `#46414C` *(extra)*, texto `#FFF`, quadrado 8×8 cheio `#EA86CF`;
  - não selecionado: fundo `#1F1D22`, borda `#322F37`, quadrado 8×8 vazado (borda 2 px `#8A8590` *(extra)*).
  - Conteúdo: "<Marca> <Modelo>" bold + "Android NN" (11 px, peso 400, `#C9C4CC`* / `#ADA7B2`). **Serial não aparece no botão** (ver contradições).
  - Clicar troca o aparelho, zera a saída (volta a "aguardando") e fecha a faixa de confirmação.
- À direita: "Diagnosticar conexão" (secundário) → seleciona o comando `conexao`; "Coletar diagnóstico" (fundo `#2E2B33`, borda `#46414C`, texto branco) → seleciona `diag`. Ambos 32 px.

## 2. Barra de ícones (`nav aria-label="Categorias"`)
Largura 72 px, fundo `#0B0A0D`, borda direita 1 px `#211F25`, padding 8×6, gap 4. Botões em coluna: ícone SVG 18×18 (stroke 1,8, `linecap square`, `linejoin miter`, sem fill) + rótulo 9 px bold.
Ordem e glifo (paths SVG próprios do protótipo, estilo linha reta):

| Rótulo | Chave | Glifo |
|---|---|---|
| Fixados | Fixados | estrela de 5 pontas |
| Apps | Apps | grade 2×2 de quadrados |
| Pacotes | Pacotes | caixa/cubo isométrico |
| Telas | Telas | janela (retângulo com barra de título) |
| Controle | Controle | gamepad (retângulo com cruz + 2 pontos) |
| Logs | Logs | folha com 3 linhas de texto |
| Captura | Captura | câmera fotográfica |
| Aparelho | Aparelho | celular (retângulo alto com traço embaixo) |
| Arquivos | Arquivos | pasta |
| Conexão | Conexão | plugue (2 pinos + corpo + cabo) |
| Meus | Meus comandos | pessoa (cabeça + ombros) |

- Ativa: fundo `#7B0A5D`, texto `#FFF`, `aria-current="page"`. Inativa: transparente, `#B9B3BD`.
- Com busca preenchida, nenhuma fica ativa. Clicar numa categoria **limpa a busca**.
- Categoria inicial: **Fixados**.

## 3. Lista (`aside aria-label="Comandos"`)
`flex 1 1 220px`, `max-width 250px`, fundo `#111013`, borda direita 1 px `#211F25`, padding 10×8, gap 10.
- Busca: `type=search`, placeholder "> buscar em tudo…", altura 30, borda 2 px `#403C46`, fundo `#0A090C`; label oculto "Buscar em todos os comandos". Filtra por **nome, comando ou resumo** (case-insensitive, substring) em todas as categorias.
- Cabeçalho: título (12 px bold) + contagem (10 px `#ADA7B2`, só o número). Título = "Resultados" (busca), "Fixados", ou o nome da categoria ("Meus comandos" para Meus).
- Item (min-height 30, padding 3×6, gap 1 entre itens):
  - selecionado: fundo `#2E2B33`, texto `#FFF` bold, nome prefixado com "> ";
  - normal: transparente, `#DCD7DF` *(extra)*.
  - Linha 2 (10 px, `#ADA7B2`; `#C9C4CC` se selecionado) = **categoria** do comando — aparece em resultados de busca e em Fixados.
  - À direita (10 px): "LOCAL" (`#ADA7B2`) em comando do técnico; "[!]" bold `#EA86CF` (`#F4C2E7` *(extra)* quando selecionado) em comando com confirmação.
  - Hover: resumo via `title` nativo (tooltip do sistema).
- Estados vazios (11 px `#ADA7B2`):
  - busca: "Nenhum comando encontrado."
  - Fixados: "Nada fixado. Abra um comando e clique em Fixar."
  - outra categoria vazia: "Nenhum comando seu ainda. Use “+ Novo comando”."
- Rodapé (colado embaixo, borda superior 1 px `#211F25`): "+ Novo comando" (primário, 30 px, texto à esquerda). Só em "Meus comandos" sem busca: "Importar" e "Exportar" (secundários 26 px, 11 px, lado a lado).

## 4. Área principal – modo visualização
Padding 16×20, gap 14, fundo `#131215`; blocos com `max-width 860px`.

**Cabeçalho do comando**
- Linha: "<CATEGORIA> /" (rótulo) + botão Fixar (22 px, borda 1 px `#322F37`, 10 px bold, ícone estrela 12 px: vazada `currentColor` / cheia `#EA86CF`; texto "Fixar" ou "Fixado", `aria-pressed`) + selo "PEDE CONFIRMAÇÃO" (10 px bold, fundo `#7B0A5D`, branco, padding 1×6) se `pede_confirmacao`.
- `h1` nome (20 px bold); resumo (`#B9B3BD`, line-height 1,5).
- "Antes de rodar, confira" (rótulo) + itens "· texto": caixa borda 1 px `#322F37`, fundo `#111013`, max 640 px. Só quando houver.
- Comando do técnico: "Comando seu, salvo neste computador." (11 px) + "Editar" + "Excluir" (secundários 26 px). Excluir em 2 cliques: o 1º troca o texto para "Confirmar exclusão"; o 2º exclui e mostra "Comando excluído." (trocar de comando desarma).

**Parâmetro** (3 variantes; o valor inicial = 1º atalho, ou `br.com.mobiltec.c4m.android.agent` se `parametro = pkg`, senão vazio):
1. *Cartões de opção* (comando com `escolha`): `fieldset` com legenda = `pergunta` (rótulo, ex. "Qual botão?"). Cartão: min 150 / max 300 px, padding 7×10, borda 2 px; marcador 8×8 igual ao do aparelho. Selecionado: borda `#7B0A5D`, fundo `#2A0921`, branco, `aria-pressed=true`; normal: borda `#322F37`, fundo `#131215`. Se `opcao_outro` existir (ex. "Outra tecla…") há um cartão extra que limpa o valor e mostra o campo de texto abaixo. Sem chips nesse modo.
2. *Campo de texto*: rótulo = `rotulo_parametro` ou padrão por tipo — pkg "Pacote do app", apk "Arquivo APK no computador", file "Arquivo no computador", path "Caminho do arquivo no aparelho", text "Valor". Input 34 px, flex 1 1 320, max 520. Placeholder = `exemplo` ou padrão (`br.com.mobiltec.c4m.android.agent`, `C:\adb\c4magent.apk`, `/sdcard/Download/arquivo.txt`, `digite o valor`). Para apk/file, botão "Procurar…" ao lado. Campo vazio na hora de executar → usa o placeholder.
3. *Chips* (sem `escolha`): linha abaixo do botão Executar, gap 6, `margin-top -6px`; prefixo "Atalhos:" (comando com atalhos) ou "Instalados:" (pkg sem atalhos → lista de pacotes). Chip: 24 px, borda 1 px `#322F37`, fundo `#1B191F` *(extra)*, 11 px; clique preenche o campo.

**Ações**: "▶ Executar no <Modelo>" (primário, 34 px, padding 0 14; ex. "▶ Executar no Galaxy A54") + toggle "Ver comando adb" / "Esconder comando adb" (secundário, texto `#A9A4AE`). Comando visível por padrão.

**Caixa do comando** (quando visível): fundo `#070609`, padding 4 4 4 10; `code` VT323 18 px `#C85F00`, `white-space: pre`, rolagem horizontal, prefixo "$ " (multilinha mostra as linhas como estão). Botão "Copiar comando" → "Copiado ✓" por 1,6 s (28 px, fundo `#19161C`*, texto `#F2EFF5`*, sem borda).

**Faixa de confirmação** (`role="alertdialog"`), aparece no lugar de rodar direto quando `pede_confirmacao`:
- Borda 2 px `#7B0A5D`, fundo `#2A0921`, padding 10×12, uma linha que quebra.
- `strong` "ATENÇÃO" (11 px, `.08em`, fundo `#7B0A5D`, branco, padding 2×6) · texto `#F8D8F0` · botões "Cancelar" (secundário) e "Sim, executar" (primário), 30 px.
- Texto: `Você vai <texto_confirmacao com {p} trocado> no <Marca> <Modelo> (<serial>). Isso pode não ter volta.`
  Ex.: "Você vai desinstalar br.com.mobiltec.c4m.android.agent no Samsung Galaxy A54 (R58N12ABCDE). Isso pode não ter volta."
  Comando do técnico: `<texto_confirmacao>` = `rodar “<nome>”`.
- Trocar aparelho, comando, opção ou rodar o comando livre fecha a faixa.

**Comando livre**: rótulo "Comando livre"; caixa borda 2 px `#322F37`, fundo `#070609`, com prefixo fixo "$ adb -s <serial>" (VT323 18 px `#8A8590`) + input transparente VT323 18 px `#C85F00`, altura 32, placeholder "shell dumpsys battery  (qualquer comando, Enter pra rodar)", sem autocomplete/spellcheck. Botões "▶ Rodar" (primário 36 px) e "Salvar como comando" (secundário 36 px).
- **Enter** roda. Vazio → status "Digite um comando no campo livre." (Rodar) / "Digite um comando no campo livre primeiro." (Salvar).
- Normalização: tira `.\adb`/`adb.exe`/`adb`, tira `-s X`, monta `adb -s <serial selecionado> …`. Ao rodar, a caixa do comando e a saída passam a refletir o comando livre (até escolher outro comando ou clicar Executar).
- "Salvar como comando" abre o formulário (Novo comando, categoria Meus comandos) com o campo Comando adb = comando normalizado **sem** `-s` (`adb shell …`).

## 5. Painel SAIDA.LOG (`section aria-label="Saída do comando"`)
Borda 2 px `#322F37`, fundo `#070609`, min-height 300, ocupa o resto da altura.
- Barra (`#211F25`, padding 4 6 4 10): "SAIDA.LOG" (bold, branco, `.06em`) + status (11 px `#C9C4CC`): "aguardando" · "executando…" · "concluído em 0,6 s" (vírgula decimal, 1 casa).
- Botões (26 px, 11 px bold, sem borda, fundo `#131215`): "Abrir pasta" (só se `gera_arquivo` **e** já executou), "Salvar saída", "Copiar saída", e "Copiar pro chamado" (fundo `#7B0A5D`). Copiar → "Copiado ✓" por 1,6 s. Salvar/Copiar não fazem nada antes de executar.
- Corpo:
  - ocioso: "> pronto. execute o comando pra ver a saída aqui. █" (VT323 19 px `#B3ACBB`*)
  - executando: "executando... █" (VT323 19 px `#C85F00`)
  - concluído: linha meta "# <Marca> <Modelo> · <Android> · serial <SERIAL> · DD/MM/AAAA HH:MM" (VT323 17 px `#A9A2B2`*) + `pre` com a saída (VT323 19 px, lh 1,2, `#E0832A`, rolagem horizontal).
- Status "Salvar saída": "Saída salva em <pasta do aparelho>\saida_2026-11-24_14-32.txt". "Abrir pasta": abre a pasta do aparelho no Explorer.
- Qualquer mudança de parâmetro/opção volta para "aguardando".

### Template "Copiar pro chamado" (exato)
```
Aparelho: <Marca> <Modelo> (Android NN)
Serial: <SERIAL>
Data: DD/MM/AAAA HH:MM
Comando: <comando montado, como na caixa, sem "$ ">
----------------------------------------
<saída>
```
Separador = 40 hífens. Data/hora = momento da execução, 24 h.

## 6. Barra de status (`footer`)
Fundo `#0B0A0D`, borda superior 1 px `#211F25`, padding 4×12, 11 px `#ADA7B2`.
- Rótulo "Pasta de saída" + caminho da pasta **do aparelho atual** (`<pasta>\<Marca>-<Modelo com espaços→hífen>_<SERIAL>`, `#DCD7DF`, ellipsis, max 520, caminho completo no `title`) + "Alterar…" e "Abrir" (22 px, borda 1 px, 10 px bold).
- "Alterar…" troca por input 280×24 (com a pasta base) + "OK" (primário). Vazio → volta a `C:\ADB-Suite\Saidas`. Mensagem: "Pasta de saída alterada. Cada aparelho ganha uma subpasta própria."
- À direita: mensagem temporária (`role="status"`, `#F8D8F0`, some em 3,5 s) e "N aparelhos conectados" (no protótipo fixo "2 aparelhos conectados").

## 7. Formulário Novo/Editar comando (substitui a área principal; max 760, gap 14)
- Rótulo "Meus comandos /" + `h1` "Novo comando" ou "Editar comando" + "Fica salvo só neste computador. Pra passar pros colegas, use Exportar e mande o arquivo." (ver contradições).
- "Nome do comando" (placeholder "ex.: Abrir config. de Wi-Fi") e "Categoria" (select: Meus comandos, Apps, Pacotes, Telas, Controle, Aparelho, Captura, Logs, Arquivos, Conexão; padrão = categoria aberta, senão Meus comandos).
- "Pra que serve (opcional)" (placeholder "Uma frase que ajude o colega a entender").
- "Comando adb": textarea 4 linhas, VT323 18 px, redimensiona na vertical, placeholder "adb shell am start -a android.settings.WIFI_SETTINGS". Ajuda (11 px): "Um comando por linha. Não precisa do `-s`: o app coloca o aparelho selecionado. Onde entra o valor digitado, escreva `{pacote}`, `{arquivo}`, `{caminho}` ou `{texto}`. Pra salvar na pasta de saída, use `{pasta}`."
- "O comando pede" (select): "Nada, roda direto" · "Um pacote de app" · "Um arquivo do computador" · "Um caminho no aparelho" · "Um texto livre". Checkbox 16 px (`accent-color #7B0A5D`) "Pedir confirmação antes de rodar".
- "Prévia no <Marca> <Modelo>": caixa `#070609`, VT323 18 px `#C85F00`, cada linha com "$ ", `-s` injetado e placeholders trocados pelo exemplo do tipo; vazio → "$ adb -s <serial> …". Atualiza ao digitar.
- Erros (faixa `role="alert"`, fundo `#2A0921`, texto `#F8D8F0`), na ordem: "Dá um nome pro comando." · "Escreve o comando adb." · "Cada linha precisa começar com adb." (validação real: ao menos uma linha começa com `adb `). Editar qualquer campo limpa o erro.
- "Salvar comando" (primário 34 px) e "Cancelar" (secundário). Ao salvar: abre o comando salvo e mostra "Salvo. Fica guardado em comandos-locais.json neste computador."

## 8. Estado e fluxos gerais
- Selecionar comando: reseta valor para o padrão, sai do modo "Outro", fecha confirmação e formulário, volta a "aguardando".
- Fixados: padrão `extrair, logcontinuo, bugreport, desinstalar, foco`; Fixar adiciona no fim; persistem por técnico (localmente). Excluir comando tira dos fixados.
- Comando com `pede_confirmacao`: Executar → faixa; "Sim, executar" → executando; Cancelar fecha.
- Importar (protótipo): "No app real: escolhe um comandos.json de um colega e os comandos entram em “Meus comandos”." Exportar: "Exportado N comando(s) em Downloads\comandos-locais.json".
- Mensagens só de protótipo (não copiar): "No app real: abre … no Explorer.", "(protótipo: …)".
- Atalhos de teclado: só **Enter** no comando livre. Nenhum outro.
- Layout responsivo: tudo `flex-wrap`; em tela estreita as colunas quebram em linhas.

## 9. Lacunas do protótipo (o app precisa definir)
- Seletor de aparelho **sem aparelho**, **não autorizado** (`unauthorized`) e **offline**: o protótipo não tem esses estados (sempre 2 aparelhos). Sugestão mínima: chip vazado com texto do estado e Executar desabilitado — confirmar com o time.
- Estado de **erro** de execução (exit code ≠ 0 / stderr): não existe no protótipo; status só tem aguardando/executando/concluído.
- Botão **Parar** para `modo: continuo` (log contínuo, gravar tela): só citado nos textos de saída ("clique em Parar pra encerrar").
- Login/cadastro e indicação de sincronização: não aparecem.

## 10. Contradições com MVP.md / DESIGN.md / CLAUDE.md
1. **Comandos do time x locais**: o protótipo trata "Meus comandos" como só locais (localStorage, `comandos-locais.json`, Importar/Exportar, "Comando seu, salvo neste computador.", "Fica salvo só neste computador…"). O MVP diz que comandos do time sincronizam para todos via API/Neon e mostram `LOCAL`/**autor**. Textos de formulário, toast de salvar e Importar/Exportar devem mudar.
2. **Exclusão**: protótipo remove fisicamente; regra é exclusão lógica (`excluido = true`).
3. **Seletor de aparelho**: MVP pede modelo, Android **e serial**; o protótipo mostra só marca/modelo + Android (serial aparece só no comando livre, rodapé, meta e confirmação).
4. **"Outro…"**: CLAUDE.md diz que `escolha` sempre tem "Outro…" abrindo campo; no protótipo/catálogo o cartão extra só existe se `opcao_outro` ≠ null (só "Apertar botão": "Outra tecla…").
5. **Hover**: MVP fala em "resumo no hover"; o protótipo usa só `title` nativo.
6. **Ordem das categorias**: barra de ícones = Fixados, Apps, Pacotes, Telas, Controle, Logs, Captura, Aparelho, Arquivos, Conexão, Meus; o select do formulário e `catalog.json` usam …Controle, Aparelho, Captura, Logs….
7. **Nomes de arquivo**: logs seguem `logAAAAMMDD_HHMM.txt`, mas Salvar saída usa `saida_AAAA-MM-DD_HH-MM.txt`, screenshot `screenshot_AAAA-MM-DD_HH-MM-SS.png`, bugreport/diagnóstico `_AAAA-MM-DD_HH-MM.zip`. Padronizar ou aceitar.
8. **Cores fora do DESIGN.md** usadas no protótipo: `#46414C` (borda selecionada), `#8A8590` (marcador vazado, prefixo do livre), `#C9C4CC`, `#DCD7DF`, `#F4C2E7`, `#E9C4DF`, `#1B191F`, `#19161C`, `#F2EFF5`, `#A9A2B2`, `#B3ACBB`. Também `#211F25` usado como borda (DESIGN só como barra do terminal). Adicionar aos tokens.
9. **Coletar diagnóstico** no topo usa estilo "superfície selecionada" (`#2E2B33`), não primário roxo; Executar perigoso tem o mesmo visual do normal (só o selo e o `[!]` diferenciam).
10. **Gravar tela**: protótipo diz "Clique de novo pra parar"; o stack pede botão **Parar** explícito.
