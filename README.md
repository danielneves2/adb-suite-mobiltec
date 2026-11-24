# ADB Suite – Mobiltec

Arsenal de comandos ADB pros técnicos: escolhe o aparelho, clica no comando, copia ou salva a saída. Comandos novos cadastrados por qualquer técnico aparecem pra todo o time.

## GitHub
1. Primeira vez: dê dois cliques em `configurar-git.bat` (pede login do GitHub no navegador).
2. Sempre que quiser sincronizar: dois cliques em `atualizar.bat`. Pra dar nome à alteração, rode no terminal `atualizar.bat "o que mudou"`.

## O que tem nesta pasta
- `CLAUDE.md` – contexto do projeto, stack e regras (o Claude Code lê sozinho).
- `docs/MVP.md` – escopo do MVP e o que fica pra depois.
- `docs/DESIGN.md` – cores, fontes e layout aprovados.
- `docs/NEON-SETUP.md` – passo a passo do Neon.
- `data/catalog.json` – os 46 comandos iniciais, com resumo, atalhos e exemplos de saída.
- `db/schema.sql`, `db/seed.sql` – tabelas e catálogo inicial pro Neon.
- `assets/logo-mobiltec.png` – logo.
- `prototype/` – código do protótipo aprovado (referência).

## Primeiro prompt sugerido no Claude Code
> Leia o CLAUDE.md e os docs. Primeiro configure o repositório do GitHub rodando configurar-git.bat e confirme que o push funcionou. Depois crie o app Tauri 2 + React + TypeScript nesta pasta seguindo o MVP e o DESIGN, com o adb embutido como sidecar. Depois faça o setup do Neon conforme docs/NEON-SETUP.md, crie a API e rode schema.sql e seed.sql. Comece pelo montador de comandos com testes. Ao fim de cada etapa que funcionar, rode atualizar.bat com uma mensagem descrevendo a etapa.
