# Atualização automática — desenho (aprovado em 2026-11-26)

## Por quê
O app vai pro time. Sem atualização automática, cada versão nova é um `.exe` mandado de mão pra cada técnico, e o time fica com versões diferentes.

## Objetivo / fora do escopo / anti-objetivo
- Objetivo: o app instalado descobre sozinho que há versão nova, avisa e se atualiza com um clique.
- Fora: atualização silenciosa sem perguntar; canais beta; assinatura de código do Windows (SmartScreen).
- Anti-objetivo: atualizar no meio de um comando rodando (logcat, vigia de prints) e derrubar o trabalho do técnico.

## Abordagens
1. **Updater oficial do Tauri + Releases do GitHub** (escolhida): plugin `updater` verifica um `latest.json` publicado na Release mais recente; o pacote é assinado com uma chave nossa. Repositório é público, então baixa sem token.
2. Servidor próprio (Vercel) servindo o `latest.json`: mais uma peça pra manter, sem ganho agora.
3. Só avisar e abrir o link de download: o técnico ainda instala na mão. Não resolve o problema.

## Como funciona
- Chave de assinatura gerada com `tauri signer generate`, guardada em `%USERPROFILE%\.tauri\adb-suite.key` (fora do repositório). A pública vai no `tauri.conf.json`. Perder a privada = apps instalados param de receber atualização.
- Endpoint: `https://github.com/danielneves2/adb-suite-mobiltec/releases/latest/download/latest.json`.
- Instalador NSIS em modo `passive` (mostra só a barra de progresso e reabre o app).
- No app:
  - ao abrir, verifica em silêncio (sem internet ou sem release = não mostra nada);
  - versão nova → aviso na barra de baixo: "Versão X disponível · Atualizar agora";
  - clicando: progresso do download (%), instala e reabre;
  - com comando rodando, o botão fica desligado ("Pare o comando antes de atualizar");
  - Configurações → Sobre: "Procurar atualização" mostra o resultado (já está na última, erro, ou versão nova).
- Publicar: `node scripts/publicar-versao.mjs` gera o instalador assinado, monta o `latest.json` e cria a Release no GitHub (`gh release create`). Publicar é ação pública: só roda com o OK do Daniel. `--sem-publicar` para antes do GitHub.
- O nome do instalador na Release não tem espaços (`ADB-Suite-Mobiltec_<versão>_x64-setup.exe`), porque o GitHub troca espaço por ponto e a URL do `latest.json` quebraria.

## Decisões minhas (pra conferir)
- Versão desta entrega: 0.3.0. Quem tem a 0.2.0 instala a 0.3.0 na mão uma vez.
- O aviso fica na barra de status (discreto), não num pop-up.
- A chave fica **sem senha**: uma senha guardada ao lado da chave (pro script rodar sozinho) não protegeria nada. A proteção é o arquivo existir só neste PC, fora do Git; o Daniel guarda uma cópia no gerenciador de senhas.
