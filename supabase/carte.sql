-- ═══════════════════════════════════════════════════════════════════════
--  CHAOS — Carte : tables, rôles et sécurité (RLS)
--  À coller UNE FOIS dans Supabase → SQL Editor → New query → Run.
--  Peut être relancé sans danger (idempotent).
-- ═══════════════════════════════════════════════════════════════════════

-- 1) Profils : un rôle par compte -------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  identifiant text unique,
  role        text not null default 'recrue'
              check (role in ('administrateur','conseil','membre','recrue')),
  created_at  timestamptz not null default now()
);

-- Rôle du compte connecté (SECURITY DEFINER = évite la récursion des règles RLS)
create or replace function public.chaos_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Crée automatiquement le profil (rôle « recrue ») à chaque nouveau compte
create or replace function public.chaos_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, identifiant)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists chaos_on_auth_user_created on auth.users;
create trigger chaos_on_auth_user_created
  after insert on auth.users
  for each row execute function public.chaos_new_user();

-- Comptes déjà existants (si vous en avez créé avant d'exécuter ce script)
insert into public.profiles (id, identifiant)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;

drop policy if exists profiles_lecture on public.profiles;
create policy profiles_lecture on public.profiles for select to authenticated
  using (id = auth.uid() or public.chaos_role() = 'administrateur');

-- Seul un administrateur peut changer un rôle (personne ne peut s'auto-promouvoir)
drop policy if exists profiles_modif_admin on public.profiles;
create policy profiles_modif_admin on public.profiles for update to authenticated
  using (public.chaos_role() = 'administrateur')
  with check (public.chaos_role() = 'administrateur');

-- 2) Repères de la carte ------------------------------------------------------------
create table if not exists public.map_markers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  category    text not null default 'autre',
  icon        text not null default 'MapPin',
  color       text not null default '#e11d2e' check (color ~ '^#[0-9a-fA-F]{6}$'),
  x           double precision not null check (x between 0 and 8192),
  y           double precision not null check (y between 0 and 8192),
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3) Zones et lignes dessinées ------------------------------------------------------
create table if not exists public.map_shapes (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('polyline','polygon','rectangle')),
  name        text not null default '' check (char_length(name) <= 80),
  color       text not null default '#e11d2e' check (color ~ '^#[0-9a-fA-F]{6}$'),
  points      jsonb not null check (jsonb_typeof(points) = 'array'),   -- [[x,y],[x,y],…] repère 0–8192
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Date de modification automatique
create or replace function public.chaos_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists map_markers_touch on public.map_markers;
create trigger map_markers_touch before update on public.map_markers
  for each row execute function public.chaos_touch();
drop trigger if exists map_shapes_touch on public.map_shapes;
create trigger map_shapes_touch before update on public.map_shapes
  for each row execute function public.chaos_touch();

-- 4) Sécurité (RLS) -------------------------------------------------------------------
alter table public.map_markers enable row level security;
alter table public.map_shapes  enable row level security;

-- Lecture : tout compte connecté
drop policy if exists markers_lecture on public.map_markers;
create policy markers_lecture on public.map_markers for select to authenticated using (true);
drop policy if exists shapes_lecture on public.map_shapes;
create policy shapes_lecture on public.map_shapes for select to authenticated using (true);

-- Création : administrateur, conseil, membre (le créateur est forcé = soi-même)
drop policy if exists markers_creation on public.map_markers;
create policy markers_creation on public.map_markers for insert to authenticated
  with check (public.chaos_role() in ('administrateur','conseil','membre') and created_by = auth.uid());
drop policy if exists shapes_creation on public.map_shapes;
create policy shapes_creation on public.map_shapes for insert to authenticated
  with check (public.chaos_role() in ('administrateur','conseil','membre') and created_by = auth.uid());

-- Modification : administrateur, conseil, membre
drop policy if exists markers_modification on public.map_markers;
create policy markers_modification on public.map_markers for update to authenticated
  using (public.chaos_role() in ('administrateur','conseil','membre'))
  with check (public.chaos_role() in ('administrateur','conseil','membre'));
drop policy if exists shapes_modification on public.map_shapes;
create policy shapes_modification on public.map_shapes for update to authenticated
  using (public.chaos_role() in ('administrateur','conseil','membre'))
  with check (public.chaos_role() in ('administrateur','conseil','membre'));

-- Suppression : administrateur uniquement
drop policy if exists markers_suppression on public.map_markers;
create policy markers_suppression on public.map_markers for delete to authenticated
  using (public.chaos_role() = 'administrateur');
drop policy if exists shapes_suppression on public.map_shapes;
create policy shapes_suppression on public.map_shapes for delete to authenticated
  using (public.chaos_role() = 'administrateur');

-- Droits d'accès à l'API (en plus des règles RLS ci-dessus, qui restent le vrai verrou)
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.map_markers to authenticated;
grant select, insert, update, delete on public.map_shapes  to authenticated;
revoke all on public.profiles, public.map_markers, public.map_shapes from anon;

-- 5) Temps réel : les changements apparaissent chez tout le monde sans recharger -------
do $$ begin
  begin alter publication supabase_realtime add table public.map_markers; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.map_shapes;  exception when duplicate_object then null; end;
end $$;

-- 6) Premier administrateur ------------------------------------------------------------
-- Après avoir créé votre compte (voir README), exécutez cette ligne en remplaçant l'identifiant :
--   update public.profiles set role = 'administrateur' where identifiant = 'vander.shinozaki-0001';
