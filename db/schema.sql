-- ADB Suite – Mobiltec · schema do banco (Neon / Postgres)
-- Rodar uma vez no SQL Editor do Neon (branch production) ou via migration.

create extension if not exists pgcrypto;

-- Usuários: cadastro simples (nome, e-mail, senha). Só serve pra saber quem criou/editou.
create table if not exists usuarios (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  email       text not null unique,
  senha_hash  text not null,                 -- bcrypt/argon2 gerado pela API, nunca a senha pura
  criado_em   timestamptz not null default now()
);

-- Comandos: catálogo oficial + comandos criados pelo time, tudo na mesma tabela.
create table if not exists comandos (
  id                 text primary key,       -- slug do catálogo (ex.: 'extrair') ou uuid pra comandos novos
  categoria          text not null,
  nome               text not null,
  resumo             text not null default '',
  comando            text not null,          -- uma linha por comando; placeholders {s} {p} {d}
  parametro          text check (parametro in ('pkg','apk','file','path','text')),
  rotulo_parametro   text,
  exemplo            text,
  atalhos            jsonb,                  -- [{ "rotulo": "...", "valor": "..." }]
  escolha            jsonb,                  -- { "pergunta": "...", "opcao_outro": "..." } → atalhos viram cartões de opção
  pede_confirmacao   boolean not null default false,
  texto_confirmacao  text,
  gera_arquivo       boolean not null default false,
  oficial            boolean not null default false,   -- veio do catálogo padrão
  criado_por         uuid references usuarios(id),
  atualizado_por     uuid references usuarios(id),
  atualizado_em      timestamptz not null default now(),
  excluido           boolean not null default false    -- exclusão é sempre lógica (recuperável)
);

create index if not exists comandos_atualizado_em_idx on comandos (atualizado_em);

-- Atualiza atualizado_em sozinho em todo update
create or replace function marca_atualizacao() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists comandos_atualizado on comandos;
create trigger comandos_atualizado
before update on comandos
for each row execute function marca_atualizacao();

-- Sincronização do app (polling a cada ~30 s):
--   select * from comandos where atualizado_em > $ultimo_sync order by atualizado_em;
-- Linhas com excluido = true chegam também, pro app remover do cache local.
