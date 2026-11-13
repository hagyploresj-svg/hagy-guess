-- HAGY GUESS · Supabase şeması. Supabase SQL Editor'de çalıştır.
create extension if not exists pgcrypto;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'lobby'
    check (status in ('lobby','starting','playing','results','finished')),
  total_rounds int not null default 5 check (total_rounds between 1 and 10),
  time_limit_sec int not null default 120 check (time_limit_sec between 0 and 600),
  current_round int not null default 0,
  round_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  is_host boolean not null default false,
  total_score int not null default 0,
  has_guessed boolean not null default false,
  joined_at timestamptz not null default now()
);
create index players_room_idx on public.players(room_id);

-- Oyuncu gizli anahtarı: anon rolü OKUYAMAZ (politika yok), sadece service role.
create table public.player_secrets (
  player_id uuid primary key references public.players(id) on delete cascade,
  secret text not null
);

-- Gerçek koordinatlar burada: anon rolü OKUYAMAZ (hile önleme).
create table public.room_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_no int not null,
  image_id text not null,
  sequence_id text,
  lat double precision not null,
  lng double precision not null,
  unique (room_id, round_no)
);

create table public.guesses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round_no int not null,
  player_id uuid not null references public.players(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  distance_km double precision not null,
  score int not null,
  created_at timestamptz not null default now(),
  unique (room_id, round_no, player_id)
);

alter table public.rooms           enable row level security;
alter table public.players         enable row level security;
alter table public.player_secrets  enable row level security;
alter table public.room_rounds     enable row level security;
alter table public.guesses         enable row level security;

-- Tarayıcı (anon) yalnızca oda ve oyuncu listesini okuyabilir (Realtime için).
-- Tüm yazma işlemleri Next.js API route'larından service role ile yapılır.
create policy "rooms_read"   on public.rooms   for select to anon using (true);
create policy "players_read" on public.players for select to anon using (true);

alter publication supabase_realtime add table public.rooms, public.players;

-- İsteğe bağlı: eski odaları temizle (pg_cron etkinse)
-- select cron.schedule('hagy-cleanup','0 * * * *',$$delete from public.rooms where created_at < now() - interval '1 day'$$);
