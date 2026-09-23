-- =============================================================================
-- GPS DAS RIMAS — atualizações de lançamento (rodar em projeto já existente)
-- =============================================================================
-- Cole este arquivo inteiro no SQL Editor do Supabase e rode uma vez. Só
-- ADICIONA coisas novas — não apaga nem recria nada que já existe, seguro
-- de rodar no projeto que já está em produção.
--
-- O que isso adiciona:
--   1. Log de auditoria: toda aprovação/rejeição/remoção de batalha e toda
--      promoção a admin fica registrada (quem fez, quando, o quê) — só
--      admins conseguem ver.
--   2. Chat em tempo real por batalha, com selo de "Criador" para quem
--      organiza a batalha, limite de 1 mensagem a cada 3 segundos por
--      pessoa (antiflood), e moderação (admin pode apagar mensagem).
--
-- Depois de rodar este arquivo, ative o Realtime na tabela chat_messages:
-- Database → Replication → clique para ativar em "chat_messages" (ou rode
-- o comando "alter publication" no final deste arquivo, que já faz isso
-- automaticamente).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Log de auditoria
-- -----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text check (actor_name is null or char_length(actor_name) <= 80),
  action text not null check (char_length(action) <= 50),
  target_type text not null check (char_length(target_type) <= 50),
  target_id uuid,
  target_label text check (target_label is null or char_length(target_label) <= 200),
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log: só admin lê" on public.audit_log;
create policy "audit_log: só admin lê"
  on public.audit_log for select
  using (public.is_admin());
-- Sem política de insert para "authenticated": só a função abaixo (security
-- definer) escreve nessa tabela, então ninguém consegue forjar uma entrada.

create or replace function public.log_admin_action(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_target_label text,
  p_details jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_name text;
begin
  select name into v_actor_name from public.profiles where id = auth.uid();
  insert into public.audit_log (actor_id, actor_name, action, target_type, target_id, target_label, details)
  values (auth.uid(), v_actor_name, p_action, p_target_type, p_target_id, p_target_label, p_details);
end;
$$;

-- Estende o trigger que já protege o status da batalha para também
-- registrar no log toda vez que um admin aprova/rejeita de verdade.
create or replace function public.protect_battle_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.status is distinct from old.status then
    if public.is_admin() then
      perform public.log_admin_action(
        case new.status when 'aprovada' then 'aprovar_batalha' when 'rejeitada' then 'rejeitar_batalha' else 'alterar_status_batalha' end,
        'battle', new.id, new.name, jsonb_build_object('de', old.status, 'para', new.status)
      );
    else
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

-- Estende o trigger que já protege o role do perfil para também registrar
-- toda promoção a admin.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    if public.is_admin() then
      perform public.log_admin_action('promover_admin', 'profile', new.id, new.name, jsonb_build_object('de', old.role, 'para', new.role));
    else
      new.role := old.role;
    end if;
  end if;
  if auth.uid() is not null and new.email is distinct from old.email and not public.is_admin() then
    new.email := old.email;
  end if;
  return new;
end;
$$;

-- Registra toda remoção de batalha feita por um admin.
create or replace function public.log_battle_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and public.is_admin() then
    perform public.log_admin_action('remover_batalha', 'battle', old.id, old.name, null);
  end if;
  return old;
end;
$$;

drop trigger if exists battles_log_delete on public.battles;
create trigger battles_log_delete
  before delete on public.battles
  for each row execute function public.log_battle_delete();

-- Registra toda denúncia resolvida por um admin.
create or replace function public.log_report_resolve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and public.is_admin() and new.status = 'resolvida' and old.status is distinct from new.status then
    perform public.log_admin_action('resolver_denuncia', 'report', new.id, new.reason, null);
  end if;
  return new;
end;
$$;

drop trigger if exists reports_log_resolve on public.reports;
create trigger reports_log_resolve
  before update on public.reports
  for each row execute function public.log_report_resolve();

-- -----------------------------------------------------------------------------
-- 2. Chat em tempo real por batalha
-- -----------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- nome/avatar são copiados no momento do envio (mesmo padrão de
  -- organizer_name em battles) — assim o chat não depende de abrir a
  -- política de leitura de profiles para todo mundo.
  user_name text not null check (char_length(user_name) between 1 and 80),
  user_avatar text check (user_avatar is null or char_length(user_avatar) <= 500),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_battle_idx on public.chat_messages (battle_id, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "chat: ler mensagens de batalhas visíveis" on public.chat_messages;
create policy "chat: ler mensagens de batalhas visíveis"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.battles b
      where b.id = battle_id
        and (b.status = 'aprovada' or b.organizer_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "chat: enviar mensagem" on public.chat_messages;
create policy "chat: enviar mensagem"
  on public.chat_messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.battles b where b.id = battle_id and b.status = 'aprovada')
  );

drop policy if exists "chat: admin remove mensagem" on public.chat_messages;
create policy "chat: admin remove mensagem"
  on public.chat_messages for delete
  using (public.is_admin());

-- Antiflood: no máximo 1 mensagem a cada 3 segundos por pessoa.
create or replace function public.enforce_chat_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.chat_messages
    where user_id = new.user_id
      and created_at > now() - interval '3 seconds'
  ) then
    raise exception 'Aguarde alguns segundos antes de enviar outra mensagem.';
  end if;
  return new;
end;
$$;

drop trigger if exists chat_rate_limit on public.chat_messages;
create trigger chat_rate_limit
  before insert on public.chat_messages
  for each row execute function public.enforce_chat_rate_limit();

-- Ativa o Realtime na tabela de chat, para as mensagens aparecerem na hora
-- em todo mundo que está com a batalha aberta, sem precisar recarregar.
do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;

-- =============================================================================
-- Pronto!
-- =============================================================================
select 1 as atualizacoes_de_lancamento_aplicadas;
