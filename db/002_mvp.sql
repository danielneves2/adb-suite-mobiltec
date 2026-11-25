-- ADB Suite – Mobiltec · migração 002 (design do MVP, 2026-11-24)
-- Idempotente: pode rodar de novo. Rodar depois de schema.sql e antes de seed.sql.

-- Comandos: modo de execução e ações extras viram dado (nada preso ao id).
alter table comandos add column if not exists modo text not null default 'normal';
alter table comandos add column if not exists comando_parar text;
alter table comandos add column if not exists comando_depois text;
alter table comandos add column if not exists acao_extra text;
alter table comandos add column if not exists texto_sem_resultado text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'comandos_modo_check') then
    alter table comandos add constraint comandos_modo_check
      check (modo in ('normal', 'continuo', 'terminal'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'comandos_acao_extra_check') then
    alter table comandos add constraint comandos_acao_extra_check
      check (acao_extra is null or acao_extra in ('copiar_imagem', 'zipar'));
  end if;
end $$;

-- Usuários: login é só o nome (sem e-mail, sem senha).
alter table usuarios drop column if exists email;
alter table usuarios drop column if exists senha_hash;
create unique index if not exists usuarios_nome_lower_idx on usuarios (lower(nome));
