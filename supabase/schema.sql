-- Training Hours App — Supabase schema
-- Run this in the Supabase SQL Editor after creating your project.

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  department text,
  manager_name text,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  created_at timestamptz not null default now()
);

-- Global system configuration (single row)
create table if not exists public.system_config (
  id int primary key default 1 check (id = 1),
  yearly_goal_hours numeric(6, 2) not null default 16,
  goal_period text not null default 'yearly' check (goal_period in ('monthly', 'yearly')),
  updated_at timestamptz not null default now()
);

insert into public.system_config (id, yearly_goal_hours)
values (1, 16)
on conflict (id) do nothing;

-- Training sessions logged by employees
create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  training_name text not null,
  session_date date not null,
  duration_hours numeric(6, 2) not null check (duration_hours > 0),
  format text not null check (format in ('in-person', 'online', 'self-paced')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists training_sessions_user_id_idx on public.training_sessions (user_id);
create index if not exists training_sessions_session_date_idx on public.training_sessions (session_date);

-- Auto-create profile on signup (always employee role)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, department, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'department',
    'employee'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.system_config enable row level security;
alter table public.training_sessions enable row level security;

-- Profiles policies
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- System config: everyone reads, admins update
drop policy if exists "Anyone authenticated can read config" on public.system_config;
drop policy if exists "Admins can update config" on public.system_config;

create policy "Anyone authenticated can read config"
  on public.system_config for select
  to authenticated
  using (true);

create policy "Admins can update config"
  on public.system_config for update
  to authenticated
  using (public.is_admin());

-- Training sessions policies
drop policy if exists "Employees can read own sessions" on public.training_sessions;
drop policy if exists "Admins can read all sessions" on public.training_sessions;
drop policy if exists "Employees can insert own sessions" on public.training_sessions;
drop policy if exists "Employees can update own sessions" on public.training_sessions;
drop policy if exists "Employees can delete own sessions" on public.training_sessions;

create policy "Employees can read own sessions"
  on public.training_sessions for select
  using (auth.uid() = user_id);

create policy "Admins can read all sessions"
  on public.training_sessions for select
  using (public.is_admin());

create policy "Employees can insert own sessions"
  on public.training_sessions for insert
  with check (auth.uid() = user_id);

create policy "Employees can update own sessions"
  on public.training_sessions for update
  using (auth.uid() = user_id);

create policy "Employees can delete own sessions"
  on public.training_sessions for delete
  using (auth.uid() = user_id);

-- Realtime (optional — enables instant goal updates on employee dashboards)
alter publication supabase_realtime add table public.system_config;

