-- ============================================================
-- Language Quest - Initial Schema
-- Phase 1a: Users, Cards, Review Logs
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- Users table (extends Supabase auth.users)
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  target_language text not null default 'es' check (target_language in ('es', 'fr')),
  native_language text not null default 'fr' check (native_language in ('es', 'fr')),
  theme_id text not null default 'one-piece' check (theme_id in ('one-piece', 'harry-potter')),
  current_phase integer not null default 1,
  current_meso integer not null default 1,
  current_day integer not null default 1,
  xp integer not null default 0,
  currency integer not null default 100,
  streak_current integer not null default 0,
  streak_longest integer not null default 0,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.users enable row level security;
create policy "Users can read own profile" on public.users
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);

-- ============================================================
-- Cards table (FSRS-managed flashcards)
-- ============================================================
create table public.cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  word_l2 text not null,
  word_l1 text not null,
  example_sentence text not null default '',
  image_url text,
  frequency_rank integer not null default 0,
  direction text not null check (direction in ('l2-to-l1', 'l1-to-l2')),
  mastery_level integer not null default 0 check (mastery_level between 0 and 5),
  fsrs_state jsonb not null default '{}'::jsonb,
  next_review timestamptz not null default now(),
  first_seen timestamptz not null default now(),
  last_reviewed timestamptz,
  created_at timestamptz not null default now(),
  -- Prevent duplicate cards per user/word/direction
  unique (user_id, word_l2, direction)
);

-- Indexes for common queries
create index idx_cards_user_due on public.cards (user_id, next_review);
create index idx_cards_user_freq on public.cards (user_id, frequency_rank);

-- RLS
alter table public.cards enable row level security;
create policy "Users can read own cards" on public.cards
  for select using (auth.uid() = user_id);
create policy "Users can insert own cards" on public.cards
  for insert with check (auth.uid() = user_id);
create policy "Users can update own cards" on public.cards
  for update using (auth.uid() = user_id);

-- ============================================================
-- Review logs (history of all card reviews)
-- ============================================================
create table public.review_logs (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 4),
  scheduled_days integer not null default 0,
  elapsed_days integer not null default 0,
  review_at timestamptz not null default now(),
  state integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_review_logs_card on public.review_logs (card_id, review_at);
create index idx_review_logs_user on public.review_logs (user_id, review_at);

-- RLS
alter table public.review_logs enable row level security;
create policy "Users can read own logs" on public.review_logs
  for select using (auth.uid() = user_id);
create policy "Users can insert own logs" on public.review_logs
  for insert with check (auth.uid() = user_id);
