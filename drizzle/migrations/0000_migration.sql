create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  name text,
  academic_level text,
  daily_hours numeric not null default 3,
  preferred_time text default 'morning',
  study_method text default 'pomodoro',
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = user_id);
create policy "own profile delete" on public.profiles for delete to authenticated using (auth.uid() = user_id);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  difficulty text not null default 'medium',
  preparation_percentage int not null default 0 check (preparation_percentage between 0 and 100),
  priority text not null default 'medium',
  exam_date date,
  weak_topics text[] not null default '{}',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index subjects_user_idx on public.subjects(user_id);
grant select, insert, update, delete on public.subjects to authenticated;
grant all on public.subjects to service_role;
alter table public.subjects enable row level security;
create policy "own subjects" on public.subjects for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  start_date date not null,
  end_date date not null,
  daily_hours numeric not null,
  generated_data jsonb not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index study_plans_user_idx on public.study_plans(user_id, created_at desc);
grant select, insert, update, delete on public.study_plans to authenticated;
grant all on public.study_plans to service_role;
alter table public.study_plans enable row level security;
create policy "own plans" on public.study_plans for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  study_plan_id uuid references public.study_plans(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  description text,
  task_type text not null default 'study',
  scheduled_date date not null,
  start_time time not null default '09:00',
  duration int not null default 60 check (duration > 0 and duration <= 600),
  completed boolean not null default false,
  completed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index tasks_user_date_idx on public.tasks(user_id, scheduled_date);
create index tasks_plan_idx on public.tasks(study_plan_id);
create index tasks_subject_idx on public.tasks(subject_id);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;
create policy "own tasks" on public.tasks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, name) values (new.id, new.raw_user_meta_data->>'name');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();