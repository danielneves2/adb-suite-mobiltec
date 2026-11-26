# Sincronização com o time (etapas 3 e 4) — desenho (aprovado em 2026-11-26)

Base: seções 7 e 8 de `2026-11-24-adb-suite-mvp-design.md`. Aqui só o que mudou ou foi decidido agora.

## Por quê
Hoje um comando criado fica só no PC de quem criou. A promessa do app é: cadastrou, o time todo tem.

## Etapa 3 — API e banco
- `server/` = projeto Vercel (Root Directory `server`), funções Web padrão (`export function GET(req)`), `@neondatabase/serverless` (HTTP) e `zod`.
- Rotas: `POST /api/entrar`, `GET /api/comandos?desde=`, `PUT /api/comandos/:id`, `DELETE /api/comandos/:id`.
  - **Mudança (minha decisão):** em vez de `POST /api/comandos` (servidor gera o id) + `PUT` (edita), só `PUT` como "cria ou atualiza" com o id gerado no app. Motivo: a migração dos comandos locais e as novas tentativas depois de falha de rede ficam idempotentes (mandar duas vezes não duplica). Custo se errado: nenhum dado perdido; dá pra acrescentar o POST depois.
- Cabeçalhos: `X-App-Key` e `X-Usuario` com `encodeURIComponent` (nome com acento não passa cru num cabeçalho HTTP).
- O cliente nunca decide `oficial`; `criado_por` só na criação; `atualizado_por` em toda edição/exclusão.
- `servidor_agora` = relógio do banco **menos 10 s**, lido antes das linhas: gravação em andamento na hora da leitura entra no próximo sync (repetir uma linha é inofensivo, perder não é).
- Banco de produção estava vazio (verificado só lendo em 2026-11-26): roda `schema.sql` → `002_mvp.sql` → `seed.sql` com `server/scripts/migrar.mjs`.
- Prova: `server/scripts/e2e.mjs` (deixa um comando de teste excluído logicamente como rastro).

## Etapa 4 — app
- Catálogo = embutido (`catalog.json`) sobreposto pelo cache do servidor (mesmo id: servidor vence). Cache e último sync no plugin-store (compartilhado entre perfis, não por usuário).
- Polling a cada 30 s. Barra de baixo: "Sincronizado" / "Sem conexão".
- Criar/editar/excluir/renomear categoria vão pra API. Sem conexão: não salva, avisa "Sem conexão — o comando não foi salvo. O catálogo continua funcionando." e o formulário continua aberto com o que foi digitado.
- Migração: na primeira conexão de cada perfil, os comandos locais (`meusComandos@<perfil>`) sobem pro time com o nome do perfil; depois a chave local é esvaziada.
- Qualquer técnico edita/exclui comandos do time (exclusão lógica). Oficiais continuam sem edição pela tela.
- Fica só no PC: fixados, pasta de saída, tamanho da janela.
- Selo do comando: "POR <AUTOR>" (sai o "SÓ NESTE PC").
- Sem `VITE_API_URL`/`VITE_APP_KEY` no build: o app funciona como hoje, só com o catálogo embutido (sem sincronizar).
