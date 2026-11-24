# ADB Suite – Mobiltec

Ferramenta desktop interna da Mobiltec que reúne os comandos ADB que os **técnicos** usam no dia a dia (instalar/remover/extrair app, log, bugreport, arquivos, telas…) num catálogo clicável. A saída de cada comando é copiada ou salva com um clique, e qualquer técnico pode cadastrar um comando novo que **atualiza pra todo o time**.

Leia também: `docs/MVP.md` (escopo e regras), `docs/DESIGN.md` (visual), `docs/NEON-SETUP.md` (banco), `data/catalog.json` (os 46 comandos iniciais).
Protótipo navegável aprovado: https://claude.ai/artifact/BpNJCkv75v45i1n8RzT1Tv (cópia do código em `prototype/`, só como referência de lógica e layout — não é código de produção).

## Repositório (fazer primeiro)
- GitHub: https://github.com/danielneves2/adb-suite-mobiltec.git, branch `main`.
- Primeira vez: rodar `configurar-git.bat` (faz `git init`, `branch -M main`, `remote add origin`, primeiro commit e `push -u origin main`; o login do GitHub abre no navegador pelo Git Credential Manager). O README já existe, então o `echo ... >> README.md` do GitHub não é necessário.
- Dia a dia: `atualizar.bat` (ou `atualizar.bat "mensagem"`) salva as alterações locais num commit, baixa as novidades com `pull --rebase` e envia com `push`. Se der conflito, ele para e explica o que fazer.
- Os `.bat` precisam ficar com fim de linha CRLF (garantido pelo `.gitattributes`). Antes de cada commit, conferir que nenhum `.env*` nem binário do platform-tools entrou.

## Público e ambiente
- Usuários: técnicos de suporte (não devs). A interface fala a língua da tarefa ("Extrair APK"), e o adb real fica visível em "Ver comando adb".
- Máquinas: **Windows** principalmente. Tudo deve funcionar sem o técnico instalar adb ou mexer em PATH.
- Idioma da interface: português do Brasil.

## Stack decidida
- **App desktop: Tauri 2 + React + TypeScript + Vite.**
- **adb embutido**: Android platform-tools empacotado como sidecar do Tauri (`src-tauri/binaries/`). O app nunca depende do adb do PATH.
- **Execução de comandos no lado Rust** (comando Tauri): recebe o comando já montado, roda o adb sidecar, devolve stdout/stderr/exit code e duração. Comandos longos (logcat contínuo, screenrecord) rodam em streaming com botão **Parar**.
- **Banco: Neon (Postgres)**, org `org-floral-art-45057230`, projeto `square-haze-64900236`, branch `production`. Setup em `docs/NEON-SETUP.md`.
- **API pequena entre o app e o Neon.** O desktop NUNCA carrega `DATABASE_URL`. Endpoints mínimos: cadastrar, login, listar mudanças desde `atualizado_em`, criar/editar comando, exclusão lógica. Use o driver e as práticas recomendadas pelas skills do Neon para o runtime em que a API for hospedada.
- **Sincronização**: polling a cada ~30 s com `atualizado_em > último_sync`. Cache local completo (o app funciona offline com o último catálogo conhecido).

## Regras do domínio (não quebrar)
1. **Comandos são dados, não código.** Todo comando vem do banco/catalog.json. Nada de comando hardcoded em componente.
2. Placeholders: `{s}` = serial do aparelho selecionado, `{p}` = valor digitado/escolhido, `{d}` = pasta de saída do aparelho. Em comandos cadastrados pelo time, o técnico escreve `adb shell …` sem `-s` e usa `{pacote}`, `{arquivo}`, `{caminho}`, `{texto}`, `{pasta}`; o app injeta `-s <serial>` depois de `adb` e troca os placeholders.
3. **Comando livre**: aceita `shell …`, `adb shell …`, `.\adb shell …` e `adb -s X …`; normaliza sempre para `adb -s <serial selecionado> …`.
4. `grep` sempre **dentro** do aparelho: `adb shell "… | grep …"` (funciona igual no Windows). Nunca `findstr`.
5. **Pasta de saída**: padrão `C:\ADB-Suite\Saidas`, configurável. Cada aparelho tem subpasta `<Marca>-<Modelo>_<SERIAL>`. Tudo que gera arquivo (`gera_arquivo: true`) salva lá. Nome de log no padrão do time: `logAAAAMMDD_HHMM.txt`.
6. Comando com `pede_confirmacao` mostra a faixa ATENÇÃO com o texto de `texto_confirmacao` + modelo e serial antes de rodar.
7. Comandos com `escolha` mostram os `atalhos` como cartões de opção (e "Outro…" abre o campo de texto). Sem `escolha`, atalhos são chips embaixo do campo.
8. **Exclusão é lógica** (`excluido = true`). Ninguém perde comando por engano.
9. "Copiar pro chamado" monta cabeçalho: aparelho, Android, serial, data/hora, comando, separador, saída.
10. Dados pessoais: o banco guarda só nome/e-mail de quem editou. Saídas (logs, serial, bugreport) ficam **só na máquina** do técnico, nunca sobem.

## Convenções
- Código e nomes técnicos em inglês; textos de interface e docs em português.
- Testes: ao menos o montador de comando (placeholders, injeção do `-s`, normalização do comando livre) com testes unitários.
- Não commitar `.env*`, binários do platform-tools baixados, nem saídas de comando.
