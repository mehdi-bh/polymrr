-- PolyMRR schema

-- Profiles
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  x_handle text unique,
  x_name text,
  avatar_url text,
  credits integer not null default 1000,
  joined_at timestamptz not null default now(),
  last_daily_login date
);

alter table profiles enable row level security;
create policy "Public read" on profiles for select using (true);
create policy "Own update" on profiles for update using (auth.uid() = id);

-- Startups
create table startups (
  slug text primary key,
  name text not null,
  icon text,
  description text,
  website text,
  country text,
  founded_date date,
  category text,
  payment_provider text not null default 'stripe',
  target_audience text,
  revenue_last_30_days integer not null default 0,
  revenue_mrr integer not null default 0,
  revenue_total integer not null default 0,
  customers integer not null default 0,
  active_subscriptions integer not null default 0,
  asking_price integer,
  profit_margin_last_30_days real,
  growth_30d real,
  multiple real,
  on_sale boolean not null default false,
  first_listed_for_sale_at timestamptz,
  x_handle text,
  x_follower_count integer,
  is_merchant_of_record boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table startups enable row level security;
create policy "Public read" on startups for select using (true);

-- Startup tech stack
create table startup_tech_stack (
  startup_slug text not null references startups on delete cascade,
  slug text not null,
  category text not null,
  primary key (startup_slug, slug)
);

alter table startup_tech_stack enable row level security;
create policy "Public read" on startup_tech_stack for select using (true);

-- Startup cofounders
create table startup_cofounders (
  startup_slug text not null references startups on delete cascade,
  x_handle text not null,
  x_name text,
  primary key (startup_slug, x_handle)
);

alter table startup_cofounders enable row level security;
create policy "Public read" on startup_cofounders for select using (true);

-- MRR history (unique constraint creates the index we need)
create table mrr_history (
  startup_slug text not null references startups on delete cascade,
  date date not null,
  mrr integer not null,
  primary key (startup_slug, date)
);

alter table mrr_history enable row level security;
create policy "Public read" on mrr_history for select using (true);

-- Markets
create table markets (
  id uuid primary key default gen_random_uuid(),
  startup_slug text not null references startups on delete cascade,
  type text not null check (type in ('mrr-target', 'growth-race', 'acquisition', 'survival')),
  question text not null,
  resolution_criteria text not null default '',
  status text not null default 'open' check (status in ('open', 'closed', 'resolved')),
  yes_odds integer not null default 50 check (yes_odds between 0 and 100),
  total_credits integer not null default 0,
  total_bettors integer not null default 0,
  created_at timestamptz not null default now(),
  closes_at timestamptz not null,
  resolved_at timestamptz,
  resolved_outcome text check (resolved_outcome in ('yes', 'no'))
);

alter table markets enable row level security;
create policy "Public read" on markets for select using (true);

-- Bets
create table bets (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references markets on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  side text not null check (side in ('yes', 'no')),
  amount integer not null check (amount >= 50),
  odds_at_time integer not null,
  created_at timestamptz not null default now()
);

alter table bets enable row level security;
create policy "Public read" on bets for select using (true);
create policy "Own insert" on bets for insert with check (auth.uid() = user_id);

-- Credit transactions
create table credit_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table credit_transactions enable row level security;
create policy "Own read" on credit_transactions for select using (auth.uid() = user_id);

-- Sync log
create table sync_log (
  id bigint generated always as identity primary key,
  source text not null,
  status text not null default 'ok',
  details jsonb,
  created_at timestamptz not null default now()
);

-- Only indexes that matter: FK columns used in JOINs/WHERE
create index idx_bets_market on bets (market_id);
create index idx_bets_user on bets (user_id);
create index idx_markets_startup on markets (startup_slug);

-- Views

create or replace view feed_items as
select
  b.id,
  p.x_handle as user_x_handle,
  b.side,
  s.name as startup_name,
  m.question as market_question,
  b.amount,
  b.created_at
from bets b
join profiles p on p.id = b.user_id
join markets m on m.id = b.market_id
join startups s on s.slug = m.startup_slug
order by b.created_at desc
limit 20;

create or replace view leaderboard as
select
  user_id, x_handle, x_name, avatar_url,
  total_predictions, win_rate, credits_won, credits_lost, current_streak
from (
  select
    p.id as user_id,
    p.x_handle,
    p.x_name,
    p.avatar_url,
    count(b.id)::integer as total_predictions,
    coalesce(round(
      count(case when m.resolved_outcome = b.side then 1 end)::numeric
      / nullif(count(case when m.status = 'resolved' then 1 end), 0) * 100
    ), 0)::integer as win_rate,
    coalesce(sum(case when m.resolved_outcome = b.side then b.amount else 0 end), 0)::integer as credits_won,
    coalesce(sum(case when m.status = 'resolved' and m.resolved_outcome != b.side then b.amount else 0 end), 0)::integer as credits_lost,
    0::integer as current_streak
  from profiles p
  left join bets b on b.user_id = p.id
  left join markets m on m.id = b.market_id
  where p.x_handle is not null
  group by p.id, p.x_handle, p.x_name, p.avatar_url
) lb
order by credits_won - credits_lost desc;

-- Functions

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, x_name, avatar_url, credits)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Anonymous'),
    new.raw_user_meta_data ->> 'avatar_url',
    1000
  );

  insert into public.credit_transactions (user_id, amount, reason)
  values (new.id, 1000, 'signup_bonus');

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function sum_startup_revenue()
returns table(total bigint)
language sql stable
as $$
  select coalesce(sum(revenue_total), 0)::bigint as total from startups;
$$;
