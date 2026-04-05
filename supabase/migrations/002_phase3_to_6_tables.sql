-- ============================================================
-- Language Quest - Migration 002
-- Tables for Phases 3-6: monitoring, assessment, characters,
-- couple, quests, delight, countdown
-- ============================================================

-- ============================================================
-- Monitoring signals (Phase 3)
-- ============================================================
create table public.monitoring_signals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id text not null default 'auto',
  performance_score integer not null default 0 check (performance_score between 0 and 100),
  freshness_score integer not null default 7 check (freshness_score between 1 and 10),
  engagement_score integer not null default 0 check (engagement_score between 0 and 100),
  retention_score integer not null default 0 check (retention_score between 0 and 100),
  decision text not null default 'none' check (decision in ('none', 'reduce-volume', 'deload')),
  created_at timestamptz not null default now()
);

create index idx_monitoring_user on public.monitoring_signals (user_id, created_at);

alter table public.monitoring_signals enable row level security;
create policy "Users can read own signals" on public.monitoring_signals
  for select using (auth.uid() = user_id);
create policy "Users can insert own signals" on public.monitoring_signals
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- Competency radar (Phase 3)
-- ============================================================
create table public.user_competency_radar (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  vocabulary_score integer not null default 0 check (vocabulary_score between 0 and 100),
  reading_score integer not null default 0 check (reading_score between 0 and 100),
  listening_score integer not null default 0 check (listening_score between 0 and 100),
  grammar_score integer not null default 0 check (grammar_score between 0 and 100),
  writing_score integer not null default 0 check (writing_score between 0 and 100),
  speaking_score integer not null default 0 check (speaking_score between 0 and 100),
  assessed_at timestamptz not null default now()
);

create index idx_radar_user on public.user_competency_radar (user_id, assessed_at);

alter table public.user_competency_radar enable row level security;
create policy "Users can read own radar" on public.user_competency_radar
  for select using (auth.uid() = user_id);
create policy "Users can insert own radar" on public.user_competency_radar
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- Characters (Phase 4)
-- ============================================================
create table public.characters (
  user_id uuid primary key references public.users(id) on delete cascade,
  traits text[] not null default '{}',
  specialty text,
  origin_story text not null default '',
  current_costume text not null default 'default',
  accessories text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.characters enable row level security;
create policy "Users can read own character" on public.characters
  for select using (auth.uid() = user_id);
create policy "Users can upsert own character" on public.characters
  for insert with check (auth.uid() = user_id);
create policy "Users can update own character" on public.characters
  for update using (auth.uid() = user_id);

-- ============================================================
-- Postcards (Phase 5)
-- ============================================================
create table public.postcards (
  id uuid primary key default uuid_generate_v4(),
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  correction text,
  reaction text,
  created_at timestamptz not null default now()
);

create index idx_postcards_to on public.postcards (to_user_id, created_at);

alter table public.postcards enable row level security;
create policy "Users can read postcards to them" on public.postcards
  for select using (auth.uid() = to_user_id or auth.uid() = from_user_id);
create policy "Users can send postcards" on public.postcards
  for insert with check (auth.uid() = from_user_id);
create policy "Users can react to postcards" on public.postcards
  for update using (auth.uid() = to_user_id);

-- ============================================================
-- Quests (Phase 6)
-- ============================================================
create table public.quests (
  id uuid primary key default uuid_generate_v4(),
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('vocabulary-hunt', 'translation-dare', 'mystery-word', 'survival-challenge', 'speed-run', 'sentence-forge')),
  title text not null,
  description text not null default '',
  parameters jsonb not null default '{}'::jsonb,
  reward_text text not null default '',
  deadline timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'failed', 'expired')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_quests_to on public.quests (to_user_id, status);

alter table public.quests enable row level security;
create policy "Users can read own quests" on public.quests
  for select using (auth.uid() = to_user_id or auth.uid() = from_user_id);
create policy "Users can create quests" on public.quests
  for insert with check (auth.uid() = from_user_id);
create policy "Users can update quests to them" on public.quests
  for update using (auth.uid() = to_user_id or auth.uid() = from_user_id);

-- ============================================================
-- Time capsules (Phase 6)
-- ============================================================
create table public.time_capsules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  day_number integer not null,
  message text not null default '',
  audio_url text,
  unlocked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.time_capsules enable row level security;
create policy "Users can read own capsules" on public.time_capsules
  for select using (auth.uid() = user_id);
create policy "Users can create capsules" on public.time_capsules
  for insert with check (auth.uid() = user_id);
create policy "Users can unlock capsules" on public.time_capsules
  for update using (auth.uid() = user_id);

-- ============================================================
-- Countdown quests (Section 15.7)
-- ============================================================
create table public.countdown_quests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  target_date date not null,
  objective_description text not null default '',
  priority_vocabulary text[] not null default '{}',
  priority_tenses text[] not null default '{}',
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.countdown_quests enable row level security;
create policy "Users can read own countdowns" on public.countdown_quests
  for select using (auth.uid() = user_id);
create policy "Users can create countdowns" on public.countdown_quests
  for insert with check (auth.uid() = user_id);
create policy "Users can update countdowns" on public.countdown_quests
  for update using (auth.uid() = user_id);
-- Shared countdowns visible to partner
create policy "Users can read shared countdowns" on public.countdown_quests
  for select using (is_shared = true);
