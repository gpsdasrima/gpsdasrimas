-- =============================================================================
-- GPS DAS RIMAS — schema completo do Supabase
-- =============================================================================
-- Como usar:
--   1. Crie um projeto em https://supabase.com
--   2. Abra o SQL Editor do projeto
--   3. Cole e rode este arquivo inteiro (uma vez só)
--   4. (Opcional) rode também supabase/seed.sql para popular com batalhas
--      de exemplo
--   5. Copie a URL e a anon key do projeto (Project Settings → API) para o
--      seu arquivo .env — veja .env.example
--
-- Este schema cobre: perfis de usuário, batalhas, favoritos e denúncias,
-- todos protegidos por Row Level Security (RLS), replicando exatamente as
-- regras de negócio do app (quem pode ver/criar/editar/remover o quê).
--
-- Reforços de segurança incluídos: limite de tamanho em todo campo de
-- texto, validação de faixa de latitude/longitude, proteção contra
-- alteração de campos sensíveis (role, email, dono da batalha, nota,
-- contador de edições) por fora dos fluxos corretos, limite de tipo/
-- tamanho de arquivo nos buckets de imagem, e trava contra denúncias
-- duplicadas em aberto.
--
-- ⚠️ Já rodou este arquivo antes num projeto que já está em produção?
-- Não rode de novo do zero — use supabase/hardening.sql, que aplica só
-- as novas proteções sem precisar recriar tabelas.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tabela: profiles
-- Estende auth.users (gerenciada pelo Supabase Auth) com dados do app.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) <= 255),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  city text check (city is null or char_length(city) <= 100),
  state text check (state is null or char_length(state) <= 50),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil público de cada usuário, 1:1 com auth.users.';

-- -----------------------------------------------------------------------------
-- Tabela: battles
-- -----------------------------------------------------------------------------
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) between 1 and 160),
  name text not null check (char_length(name) between 1 and 120),
  description text not null check (char_length(description) between 1 and 3000),
  city text not null check (char_length(city) between 1 and 100),
  state text not null check (char_length(state) between 1 and 10),
  neighborhood text not null check (char_length(neighborhood) between 1 and 100),
  address text not null check (char_length(address) between 1 and 300),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  date date not null,
  time time not null,
  day_of_week text not null check (char_length(day_of_week) <= 40),
  frequency text not null check (frequency in ('semanal', 'quinzenal', 'mensal', 'unico')),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  organizer_name text not null check (char_length(organizer_name) between 1 and 120),
  instagram text check (instagram is null or char_length(instagram) <= 100),
  tiktok text check (tiktok is null or char_length(tiktok) <= 100),
  whatsapp text check (whatsapp is null or char_length(whatsapp) <= 30),
  image text check (image is null or char_length(image) <= 500),
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada')),
  editions_count integer not null default 1 check (editions_count >= 0),
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  participants_estimate integer check (participants_estimate is null or participants_estimate >= 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists battles_status_idx on public.battles (status);
create index if not exists battles_city_idx on public.battles (city);
create index if not exists battles_organizer_idx on public.battles (organizer_id);

-- -----------------------------------------------------------------------------
-- Tabela: favorites
-- -----------------------------------------------------------------------------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  battle_id uuid not null references public.battles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, battle_id)
);

-- -----------------------------------------------------------------------------
-- Tabela: reports (denúncias)
-- -----------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  battle_id uuid not null references public.battles (id) on delete cascade,
  reason text not null check (
    reason in ('local_incorreto', 'data_incorreta', 'batalha_nao_existe', 'informacao_falsa', 'outro')
  ),
  description text check (description is null or char_length(description) <= 1000),
  status text not null default 'pendente' check (status in ('pendente', 'resolvida')),
  created_at timestamptz not null default now()
);

-- Antiabuso: impede que a mesma pessoa deixe várias denúncias em aberto
-- empilhadas na mesma batalha (pode denunciar de novo depois que a
-- anterior for resolvida).
create unique index if not exists reports_one_open_per_user_battle
  on public.reports (user_id, battle_id)
  where status = 'pendente';

-- -----------------------------------------------------------------------------
-- Tabela: audit_log
-- Registro de toda ação de moderação (aprovar/rejeitar/remover batalha,
-- promover admin, resolver denúncia) — só admins conseguem ler.
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

-- -----------------------------------------------------------------------------
-- Tabela: chat_messages
-- Chat público por batalha. user_name/user_avatar são copiados no envio
-- (mesmo padrão de organizer_name em battles), assim o chat não depende
-- de abrir a leitura de profiles para todo mundo.
-- -----------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_name text not null check (char_length(user_name) between 1 and 80),
  user_avatar text check (user_avatar is null or char_length(user_avatar) <= 500),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_battle_idx on public.chat_messages (battle_id, created_at);

-- =============================================================================
-- Funções auxiliares
-- =============================================================================

-- Verifica se o usuário autenticado atual é administrador.
-- security definer + search_path fixo evitam recursão de RLS e ataques de
-- "search_path hijacking".
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Grava uma linha no log de auditoria. Não tem policy de insert própria —
-- só é chamada de dentro de outras funções security definer (nunca
-- diretamente pelo client), então ninguém consegue forjar uma entrada.
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

-- Promove outro usuário a administrador. Só pode ser chamada por quem já é
-- admin — substitui o antigo "hack" de console usado no protótipo local.
create or replace function public.promote_to_admin(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem promover outros usuários.';
  end if;
  update public.profiles set role = 'admin' where email = target_email;
end;
$$;

-- Cria automaticamente um profile quando alguém cria conta pelo Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, city, state)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'city',
    new.raw_user_meta_data ->> 'state'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém updated_at em dia automaticamente.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists battles_set_updated_at on public.battles;
create trigger battles_set_updated_at
  before update on public.battles
  for each row execute function public.set_updated_at();

-- Impede que qualquer pessoa além de admins altere o status de uma batalha
-- (aprovar/rejeitar) e que qualquer pessoa altere o papel (role) de um
-- perfil por fora da função promote_to_admin.
create or replace function public.protect_battle_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() nulo = chamada feita fora de uma sessão de usuário comum
  -- (SQL Editor, seed, service_role) — contextos de confiança do projeto.
  -- Com uma sessão de usuário, só admin pode mudar o status — e quando
  -- muda de verdade, fica registrado no log de auditoria.
  if auth.uid() is not null and new.status is distinct from old.status then
    if public.is_admin() then
      perform public.log_admin_action(
        case new.status
          when 'aprovada' then 'aprovar_batalha'
          when 'rejeitada' then 'rejeitar_batalha'
          else 'alterar_status_batalha'
        end,
        'battle', new.id, new.name, jsonb_build_object('de', old.status, 'para', new.status)
      );
    else
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists battles_protect_status on public.battles;
create trigger battles_protect_status
  before update on public.battles
  for each row execute function public.protect_battle_status();

-- Impede que o usuário altere o próprio "role" (role) por fora da função
-- promote_to_admin, e impede que altere o "email" exibido no perfil sem
-- que isso venha do e-mail real de login (auth.users) — do contrário
-- alguém poderia forjar o e-mail mostrado no próprio perfil para se
-- passar por outra pessoa.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    if public.is_admin() then
      perform public.log_admin_action(
        'promover_admin', 'profile', new.id, new.name, jsonb_build_object('de', old.role, 'para', new.role)
      );
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

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Força toda batalha nova a nascer como "pendente", a menos que quem
-- cadastre já seja admin (ex.: seeds/importações feitas pela equipe).
create or replace function public.force_pending_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.status := 'pendente';
  end if;
  return new;
end;
$$;

drop trigger if exists battles_force_pending on public.battles;
create trigger battles_force_pending
  before insert on public.battles
  for each row execute function public.force_pending_on_insert();

-- Impede que o organizador (ou qualquer requisição feita fora de uma
-- sessão confiável) altere campos que deveriam ficar só nas mãos da
-- moderação: quem é o dono da batalha, a nota média, o contador de
-- edições, a data de criação e a flag de "exemplo demonstrativo". Sem
-- isso, um usuário mal-intencionado poderia inflar a própria nota ou
-- "roubar" a autoria de uma batalha chamando a API diretamente, por
-- fora da tela de edição.
create or replace function public.protect_battle_restricted_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.organizer_id := old.organizer_id;
    new.rating := old.rating;
    new.editions_count := old.editions_count;
    new.is_demo := old.is_demo;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists battles_protect_restricted_fields on public.battles;
create trigger battles_protect_restricted_fields
  before update on public.battles
  for each row execute function public.protect_battle_restricted_fields();

-- Registra no log de auditoria toda remoção de batalha feita por um admin.
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

-- Registra no log de auditoria toda denúncia resolvida por um admin.
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

-- Antiflood do chat: no máximo 1 mensagem a cada 3 segundos por pessoa.
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

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.battles enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;
alter table public.chat_messages enable row level security;

-- --- profiles ---------------------------------------------------------------
drop policy if exists "profiles: ler o próprio perfil ou ser admin" on public.profiles;
create policy "profiles: ler o próprio perfil ou ser admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles: atualizar o próprio perfil" on public.profiles;
create policy "profiles: atualizar o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- inserção é feita pelo trigger handle_new_user (security definer);
-- não há policy de insert para o client comum.

-- --- battles ------------------------------------------------------------------
drop policy if exists "battles: aprovadas são públicas" on public.battles;
create policy "battles: aprovadas são públicas"
  on public.battles for select
  using (status = 'aprovada' or organizer_id = auth.uid() or public.is_admin());

drop policy if exists "battles: usuário logado pode cadastrar" on public.battles;
create policy "battles: usuário logado pode cadastrar"
  on public.battles for insert
  to authenticated
  with check (organizer_id = auth.uid());

drop policy if exists "battles: dono ou admin pode editar" on public.battles;
create policy "battles: dono ou admin pode editar"
  on public.battles for update
  using (organizer_id = auth.uid() or public.is_admin())
  with check (organizer_id = auth.uid() or public.is_admin());

drop policy if exists "battles: só admin remove" on public.battles;
create policy "battles: só admin remove"
  on public.battles for delete
  using (public.is_admin());

-- --- favorites ----------------------------------------------------------------
drop policy if exists "favorites: só o próprio usuário" on public.favorites;
create policy "favorites: só o próprio usuário"
  on public.favorites for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --- reports --------------------------------------------------------------------
drop policy if exists "reports: criar denúncia própria" on public.reports;
create policy "reports: criar denúncia própria"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "reports: ver a própria ou ser admin" on public.reports;
create policy "reports: ver a própria ou ser admin"
  on public.reports for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "reports: só admin resolve" on public.reports;
create policy "reports: só admin resolve"
  on public.reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- --- audit_log ------------------------------------------------------------------
drop policy if exists "audit_log: só admin lê" on public.audit_log;
create policy "audit_log: só admin lê"
  on public.audit_log for select
  using (public.is_admin());
-- Sem policy de insert: só a função log_admin_action (security definer)
-- escreve aqui, então ninguém consegue forjar uma entrada no log.

-- --- chat_messages ----------------------------------------------------------------
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

-- Ativa o Realtime na tabela de chat — as mensagens aparecem na hora para
-- quem estiver com a batalha aberta, sem precisar recarregar a página.
do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;

-- =============================================================================
-- Storage: fotos de perfil e banners de batalha
-- =============================================================================
-- Cria dois buckets públicos (a leitura é pública, mas só o dono do arquivo
-- pode enviar/trocar/remover): "avatars" para foto de perfil e
-- "battle-images" para o banner de cada batalha.
--
-- Reforço de segurança no próprio bucket (não depende só da validação do
-- app): tamanho máximo de 5 MB e apenas os tipos de imagem realmente
-- usados (jpeg/png/webp) — isso vale mesmo que alguém chame a API do
-- Storage diretamente, por fora do app, tentando enviar um arquivo maior
-- ou de outro tipo (ex.: SVG, que pode carregar script embutido).
--
-- Convenção de caminho dos arquivos: {user_id}/{timestamp}-{nome}.ext
-- (o primeiro segmento do caminho precisa ser o uid de quem enviou — é o
-- que as políticas abaixo verificam).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('battle-images', 'battle-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars: leitura pública" on storage.objects;
create policy "avatars: leitura pública"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars: enviar no próprio diretório" on storage.objects;
create policy "avatars: enviar no próprio diretório"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: atualizar o próprio arquivo" on storage.objects;
create policy "avatars: atualizar o próprio arquivo"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: remover o próprio arquivo" on storage.objects;
create policy "avatars: remover o próprio arquivo"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "battle-images: leitura pública" on storage.objects;
create policy "battle-images: leitura pública"
  on storage.objects for select
  using (bucket_id = 'battle-images');

drop policy if exists "battle-images: enviar no próprio diretório" on storage.objects;
create policy "battle-images: enviar no próprio diretório"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'battle-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "battle-images: atualizar o próprio arquivo" on storage.objects;
create policy "battle-images: atualizar o próprio arquivo"
  on storage.objects for update
  using (bucket_id = 'battle-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "battle-images: remover o próprio arquivo" on storage.objects;
create policy "battle-images: remover o próprio arquivo"
  on storage.objects for delete
  using (bucket_id = 'battle-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================================================
-- Fim do schema.
-- Próximo passo: rode supabase/seed.sql para ter batalhas de exemplo, e
-- promova sua própria conta a admin com o comando abaixo (troque o e-mail):
--
--   update public.profiles set role = 'admin' where email = 'voce@email.com';
--
-- (Só é preciso fazer isso manualmente para o PRIMEIRO admin — depois disso,
-- use a função promote_to_admin() ou o painel /admin do app.)
-- =============================================================================
