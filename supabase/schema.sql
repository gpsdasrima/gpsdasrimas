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
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tabela: profiles
-- Estende auth.users (gerenciada pelo Supabase Auth) com dados do app.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  city text,
  state text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil público de cada usuário, 1:1 com auth.users.';

-- -----------------------------------------------------------------------------
-- Tabela: battles
-- -----------------------------------------------------------------------------
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  city text not null,
  state text not null,
  neighborhood text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  date date not null,
  time time not null,
  day_of_week text not null,
  frequency text not null check (frequency in ('semanal', 'quinzenal', 'mensal', 'unico')),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  organizer_name text not null,
  instagram text,
  tiktok text,
  whatsapp text,
  image text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada')),
  editions_count integer not null default 1,
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  participants_estimate integer,
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
  description text,
  status text not null default 'pendente' check (status in ('pendente', 'resolvida')),
  created_at timestamptz not null default now()
);

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
  -- Com uma sessão de usuário, só admin pode mudar o status.
  if auth.uid() is not null and new.status is distinct from old.status and not public.is_admin() then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists battles_protect_status on public.battles;
create trigger battles_protect_status
  before update on public.battles
  for each row execute function public.protect_battle_status();

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
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

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.battles enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;

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

-- =============================================================================
-- Storage: fotos de perfil e banners de batalha
-- =============================================================================
-- Cria dois buckets públicos (a leitura é pública, mas só o dono do arquivo
-- pode enviar/trocar/remover): "avatars" para foto de perfil e
-- "battle-images" para o banner de cada batalha.
--
-- Convenção de caminho dos arquivos: {user_id}/{timestamp}-{nome}.ext
-- (o primeiro segmento do caminho precisa ser o uid de quem enviou — é o
-- que as políticas abaixo verificam).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('battle-images', 'battle-images', true)
on conflict (id) do nothing;

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
