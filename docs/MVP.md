# Escopo do MVP

## Telas e áreas (ver protótipo)
- **Topo**: logo + "ADB SUITE - MOBILTEC", seletor de aparelhos conectados (modelo, Android, serial), botões **Diagnosticar conexão** e **Coletar diagnóstico**.
- **Barra de ícones (esquerda)**: Fixados, Apps, Pacotes, Telas, Controle, Logs, Captura, Aparelho, Arquivos, Conexão, Meus. A ativa fica em roxo.
- **Lista (segunda coluna)**: busca em todos os comandos (resultado mostra a categoria), título + contagem da categoria, comandos da categoria, `[!]` em perigosos, `LOCAL`/autor em comandos do time, **+ Novo comando** no rodapé. Resumo do comando no hover.
- **Área principal**: categoria, botão **Fixar**, nome, resumo, "Antes de rodar, confira" (quando houver), parâmetro (campo, chips ou cartões de opção), **▶ Executar no <modelo>**, **Ver comando adb** + copiar, faixa de confirmação, **Comando livre**, painel **SAIDA.LOG**.
- **Painel de saída**: status (aguardando/executando/concluído em X s), **Abrir pasta** (quando gerou arquivo), **Salvar saída** (.txt na pasta do aparelho), **Copiar saída**, **Copiar pro chamado**.
- **Barra de status (rodapé)**: pasta de saída do aparelho atual com **Alterar…** e **Abrir**, mensagens de confirmação, nº de aparelhos conectados.
- **Formulário de comando** (novo/editar): nome, categoria, resumo, comando adb (multilinha), "o comando pede" (nada/pacote/arquivo/caminho/texto), pedir confirmação, prévia ao vivo no aparelho selecionado. "Salvar como comando" no comando livre abre esse formulário preenchido.

## Funcionalidades do MVP
1. Detectar aparelhos (`adb devices -l` + `getprop`) e atualizar a lista ao plugar/desplugar.
2. Executar comandos do catálogo e o comando livre no aparelho selecionado.
3. Autocomplete de pacote com `pm list packages` do aparelho selecionado.
4. Screenshot direto pro clipboard (imagem) e salvo na pasta.
5. Logcat contínuo com Parar; Salvar log atual; Limpar log; Bugreport; Coletar diagnóstico (zip).
6. Fixados por técnico (salvos localmente).
7. Cadastro simples (nome, e-mail, senha) e login lembrado.
8. Comandos do time: criar, editar, excluir (lógico); sincroniza pra todos via polling ~30 s; cache offline.

## Segunda versão (não fazer agora)
- Rodar o mesmo comando em **todos os aparelhos** conectados.
- adb antigo para Android 5.1 escolhido automaticamente, se o time confirmar que precisa.
- Histórico de execuções.
- Restringir cadastro ao domínio de e-mail da empresa.
