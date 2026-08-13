-- Iron Ledger — Supabase schema.
--
-- One-time setup: paste this whole file into the Supabase dashboard's
-- SQL Editor (your project -> SQL Editor -> New query) and run it. It's
-- idempotent (safe to re-run) — DROP POLICY IF EXISTS guards every policy.
--
-- Data model mirrors the client's existing shape closely on purpose: `sets`
-- stays a jsonb array of {weight, reps, rpe} rather than a normalized child
-- table, since every algorithm module (progression.js, planGenerator.js,
-- readiness.js) already consumes a session's sets as a single array and a
-- join would only add round-trip complexity with no benefit for a
-- single-user log. exercise_meta and profiles are true relational tables.
--
-- Security model: every table is scoped to auth.uid() via row-level
-- security, so even though the client holds a public "publishable" key,
-- Postgres itself refuses to return or accept rows for any other user.

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  exercise_name text not null,
  goal text not null check (goal in ('strength', 'hypertrophy', 'endurance')),
  type text not null check (type in ('hypertrophy', 'strength')),
  muscle_group text not null,
  unit text not null check (unit in ('kg', 'lb')),
  sets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_exercise_date_idx
  on public.sessions (user_id, exercise_name, date desc);

create table if not exists public.exercise_meta (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  muscle_group text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_name)
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bodyweight numeric,
  height numeric,
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  updated_at timestamptz not null default now()
);

alter table public.sessions enable row level security;
alter table public.exercise_meta enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own" on public.sessions
  for select using (auth.uid() = user_id);

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own" on public.sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own" on public.sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own" on public.sessions
  for delete using (auth.uid() = user_id);

drop policy if exists "exercise_meta_select_own" on public.exercise_meta;
create policy "exercise_meta_select_own" on public.exercise_meta
  for select using (auth.uid() = user_id);

drop policy if exists "exercise_meta_upsert_own" on public.exercise_meta;
create policy "exercise_meta_upsert_own" on public.exercise_meta
  for insert with check (auth.uid() = user_id);

drop policy if exists "exercise_meta_update_own" on public.exercise_meta;
create policy "exercise_meta_update_own" on public.exercise_meta
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
