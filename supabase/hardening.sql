-- =============================================================================
-- GPS DAS RIMAS — reforço de segurança (rodar em projeto já existente)
-- =============================================================================
-- Use este arquivo se você já rodou supabase/schema.sql antes num projeto
-- que já está de pé (como o seu). Ele só ADICIONA as proteções novas —
-- não apaga nem recria nenhuma tabela, então é seguro rodar no projeto
-- que já tem dados de verdade.
--
-- Cole este arquivo inteiro no SQL Editor do Supabase e rode uma vez.
-- Rodar de novo no futuro não quebra nada (todo comando aqui é seguro de
-- repetir).
--
-- O que isso corrige:
--   1. Limite de tamanho em campos de texto (evita abuso/spam com textos
--      gigantes) e validação de latitude/longitude.
--   2. Trava para que ninguém altere o próprio "role" ou o "email" do
--      perfil por fora dos fluxos corretos (evita virar admin sozinho ou
--      forjar o e-mail exibido para se passar por outra pessoa).
--   3. Trava para que o organizador de uma batalha não consiga alterar
--      quem é o dono, a nota, o contador de edições ou a data de criação
--      chamando a API diretamente (por fora da tela de edição).
--   4. Impede denúncias duplicadas empilhadas da mesma pessoa na mesma
--      batalha.
--   5. Limite de tipo e tamanho de arquivo nos buckets de imagem
--      (avatars / battle-images), aplicado pelo próprio Storage — não só
--      pelo app.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Limites de tamanho e validação de dados
-- -----------------------------------------------------------------------------
do $$
begin
  alter table public.profiles add constraint profiles_name_length check (char_length(name) between 1 and 80);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles add constraint profiles_email_length check (char_length(email) <= 255);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles add constraint profiles_avatar_url_length
    check (avatar_url is null or char_length(avatar_url) <= 500);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles add constraint profiles_city_length
    check (city is null or char_length(city) <= 100);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles add constraint profiles_state_length
    check (state is null or char_length(state) <= 50);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_name_length check (char_length(name) between 1 and 120);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_description_length
    check (char_length(description) between 1 and 3000);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_city_length check (char_length(city) between 1 and 100);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_state_length check (char_length(state) between 1 and 10);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_neighborhood_length
    check (char_length(neighborhood) between 1 and 100);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_address_length check (char_length(address) between 1 and 300);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_day_of_week_length check (char_length(day_of_week) <= 40);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_organizer_name_length
    check (char_length(organizer_name) between 1 and 120);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_instagram_length
    check (instagram is null or char_length(instagram) <= 100);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_tiktok_length
    check (tiktok is null or char_length(tiktok) <= 100);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_whatsapp_length
    check (whatsapp is null or char_length(whatsapp) <= 30);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_image_length
    check (image is null or char_length(image) <= 500);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_slug_length check (char_length(slug) between 1 and 160);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_latitude_range check (latitude between -90 and 90);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_longitude_range check (longitude between -180 and 180);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_editions_count_positive check (editions_count >= 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.battles add constraint battles_participants_positive
    check (participants_estimate is null or participants_estimate >= 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.reports add constraint reports_description_length
    check (description is null or char_length(description) <= 1000);
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Proteção de campos sensíveis no perfil (role + email)
-- -----------------------------------------------------------------------------
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
  if auth.uid() is not null and new.email is distinct from old.email and not public.is_admin() then
    new.email := old.email;
  end if;
  return new;
end;
$$;
-- (create or replace já atualiza a função existente — o trigger que a usa
-- não precisa ser recriado.)

-- -----------------------------------------------------------------------------
-- 3. Proteção de campos administrativos da batalha
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 4. Antiabuso: uma denúncia em aberto por pessoa/batalha
-- -----------------------------------------------------------------------------
create unique index if not exists reports_one_open_per_user_battle
  on public.reports (user_id, battle_id)
  where status = 'pendente';

-- -----------------------------------------------------------------------------
-- 5. Buckets de imagem: limite de tipo e tamanho de arquivo
-- -----------------------------------------------------------------------------
update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('avatars', 'battle-images');

-- -----------------------------------------------------------------------------
-- 6. Reforço na política de favoritos (mesma regra, mais explícita)
-- -----------------------------------------------------------------------------
drop policy if exists "favorites: só o próprio usuário" on public.favorites;
create policy "favorites: só o próprio usuário"
  on public.favorites for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- Pronto! Rode "select 1;" pra confirmar que chegou até o fim sem erro.
-- =============================================================================
select 1 as migracao_de_seguranca_aplicada;
