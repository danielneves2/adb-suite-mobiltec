# Setup do Neon (passo a passo do time)

1. `npm i -g neon@latest`. Se falhar, use `npx neon@latest` no lugar de `neon`.
   Se um comando do neon abrir login no navegador, terminar lá. Se der timeout ou falhar, rodar `neon login` e tentar de novo.
2. Na raiz do projeto:
   `neon init -y --org-id org-floral-art-45057230 --project-id square-haze-64900236 --branch production --services postgres`
3. `neon deploy`. Provisiona os serviços do `neon.ts` e puxa as variáveis pro `.env.local` (ou `.env`, se existir).
4. Ligar cada serviço no código usando essas variáveis. Consultar as skills de agente do Neon instaladas para boas práticas (ex.: qual driver usar conforme a arquitetura e o runtime de hospedagem).
5. Provar que funciona: `npm run build` precisa passar; subir o app e testar cada serviço ligado de ponta a ponta.
6. Relatar o que mudou, a saída dos comandos que provam o passo 5 e o que falhou.

## Banco
- Rodar `db/schema.sql` e depois `db/seed.sql` (46 comandos oficiais; pode rodar de novo sem duplicar).
- A `DATABASE_URL` fica **só na API**, nunca no app desktop.
- Teste de ponta a ponta mínimo: cadastrar usuário → login → listar comandos (46) → criar comando → listar mudanças desde o último sync e ver o novo → exclusão lógica → ver `excluido = true` no sync.
