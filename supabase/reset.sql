-- ==========================================================================
-- PolyMRR: Full DB reset (preserves auth.users + profiles data)
-- Run in Supabase SQL Editor as a single transaction.
-- ==========================================================================

begin;

-- -----------------------------------------------------------------------
-- PHASE 1: Tear down (reverse dependency order)
-- -----------------------------------------------------------------------

drop view if exists feed_items cascade;
drop view if exists leaderboard cascade;

drop function if exists place_bet(uuid, uuid, text, bigint);
drop function if exists distribute_payout(uuid, integer, uuid, uuid);
drop function if exists complete_quest(uuid, text, integer);
drop function if exists sum_startup_revenue();
drop function if exists tstz_to_date(timestamptz) cascade;

drop table if exists user_quest_completions cascade;
drop table if exists credit_transactions cascade;
drop table if exists bets cascade;
drop table if exists markets cascade;
drop table if exists sync_log cascade;
drop table if exists startup_snapshots cascade;
drop table if exists mrr_history cascade;
drop table if exists startup_tech_stack cascade;
drop table if exists startup_cofounders cascade;
drop table if exists startups cascade;

drop policy if exists "Public read avatars" on storage.objects;
drop policy if exists "Users upload own avatar" on storage.objects;
drop policy if exists "Users update own avatar" on storage.objects;
drop policy if exists "Users delete own avatar" on storage.objects;

-- -----------------------------------------------------------------------
-- PHASE 2: Create tables
-- -----------------------------------------------------------------------

-- Profiles — IF NOT EXISTS so existing user rows survive
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  x_handle text unique,
  x_name text,
  avatar_url text,
  credits integer not null default 1000,
  joined_at timestamptz not null default now(),
  last_daily_login date
);

alter table profiles enable row level security;
drop policy if exists "Public read" on profiles;
create policy "Public read" on profiles for select using (true);
drop policy if exists "Own update" on profiles;
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
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

alter table startups enable row level security;
create policy "Public read" on startups for select using (true);

create table startup_tech_stack (
  startup_slug text not null references startups on delete cascade,
  slug text not null,
  category text not null,
  primary key (startup_slug, slug)
);

alter table startup_tech_stack enable row level security;
create policy "Public read" on startup_tech_stack for select using (true);

create table startup_cofounders (
  startup_slug text not null references startups on delete cascade,
  x_handle text not null,
  x_name text,
  primary key (startup_slug, x_handle)
);

alter table startup_cofounders enable row level security;
create policy "Public read" on startup_cofounders for select using (true);

create table mrr_history (
  startup_slug text not null references startups on delete cascade,
  date date not null,
  mrr integer not null,
  primary key (startup_slug, date)
);

alter table mrr_history enable row level security;
create policy "Public read" on mrr_history for select using (true);

create table startup_snapshots (
  startup_slug text not null references startups on delete cascade,
  snapshot_date date not null,
  mrr integer not null default 0,
  revenue_last_30_days integer not null default 0,
  revenue_total integer not null default 0,
  customers integer not null default 0,
  active_subscriptions integer not null default 0,
  growth_30d real,
  on_sale boolean not null default false,
  asking_price integer,
  primary key (startup_slug, snapshot_date)
);

alter table startup_snapshots enable row level security;
create policy "Public read" on startup_snapshots for select using (true);

-- Markets
create table markets (
  id uuid primary key default gen_random_uuid(),
  startup_slug text not null references startups on delete cascade,
  type text not null check (type in ('mrr-target', 'growth-race', 'acquisition', 'survival', 'founder')),
  founder_x_handle text,
  question text not null,
  resolution_criteria text not null default '',
  resolution_config jsonb,
  created_by uuid references profiles(id),
  status text not null default 'open' check (status in ('open', 'closed', 'resolved')),
  yes_odds integer not null default 50 check (yes_odds between 0 and 100),
  yes_shares real not null default 0,
  no_shares real not null default 0,
  liquidity_param real not null default 1500,
  total_credits integer not null default 0,
  total_yes_credits bigint not null default 0,
  total_no_credits bigint not null default 0,
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
  shares real,
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
  ref_bet_id uuid references bets(id),
  ref_market_id uuid references markets(id),
  created_at timestamptz not null default now()
);

alter table credit_transactions enable row level security;
create policy "Own read" on credit_transactions for select using (auth.uid() = user_id);

-- Quest completions
create table user_quest_completions (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade,
  quest_id text not null,
  reward_amount integer not null,
  completed_at timestamptz not null default now(),
  unique (user_id, quest_id)
);

alter table user_quest_completions enable row level security;
create policy "Own read" on user_quest_completions for select using (auth.uid() = user_id);

-- Sync log
create table sync_log (
  id bigint generated always as identity primary key,
  source text not null,
  status text not null default 'ok',
  details jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- PHASE 3: Indexes
-- -----------------------------------------------------------------------

-- (market_id, side) covers market_id-only lookups via prefix, no separate idx needed
create index idx_bets_market_side on bets (market_id, side);
create index idx_bets_user on bets (user_id);
create index idx_markets_startup on markets (startup_slug);
create index idx_snapshots_slug_date on startup_snapshots (startup_slug, snapshot_date desc);
create index idx_quest_completions_user on user_quest_completions (user_id);
create index idx_markets_founder on markets (founder_x_handle) where founder_x_handle is not null;

-- Immutable cast needed for index expressions (timestamptz->date depends on timezone)
create or replace function tstz_to_date(ts timestamptz)
returns date language sql immutable as $$
  select (ts at time zone 'UTC')::date;
$$;

create unique index idx_markets_no_duplicates
  on markets (
    startup_slug,
    (resolution_config->>'metric'),
    (resolution_config->>'condition'),
    (resolution_config->>'target'),
    tstz_to_date(closes_at)
  )
  where resolution_config is not null;

-- -----------------------------------------------------------------------
-- PHASE 4: Views
-- -----------------------------------------------------------------------

create view feed_items as
select
  b.id,
  b.market_id,
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

create view leaderboard as
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
    -- credits_won = actual payouts received (from credit_transactions)
    coalesce((
      select sum(ct.amount) from credit_transactions ct
      where ct.user_id = p.id and ct.reason = 'bet_won'
    ), 0)::integer as credits_won,
    -- credits_lost = sum of bet amounts on losing side
    coalesce(sum(case when m.status = 'resolved' and m.resolved_outcome != b.side then b.amount else 0 end), 0)::integer as credits_lost,
    0::integer as current_streak
  from profiles p
  left join bets b on b.user_id = p.id
  left join markets m on m.id = b.market_id
  where p.x_handle is not null
  group by p.id, p.x_handle, p.x_name, p.avatar_url
) lb
order by credits_won - credits_lost desc;

-- -----------------------------------------------------------------------
-- PHASE 5: Functions & triggers
-- -----------------------------------------------------------------------

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
    10000
  );
  insert into public.user_quest_completions (user_id, quest_id, reward_amount)
  values (new.id, 'signup', 10000);
  insert into public.credit_transactions (user_id, amount, reason)
  values (new.id, 10000, 'quest_reward');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function sum_startup_revenue()
returns table(total bigint)
language sql stable
as $$
  select coalesce(sum(revenue_total), 0)::bigint as total from startups;
$$;

create or replace function place_bet(
  p_user_id uuid,
  p_market_id uuid,
  p_side text,
  p_amount bigint
) returns jsonb as $$
declare
  v_market markets%rowtype;
  v_profile profiles%rowtype;
  v_shares real;
  v_cost_before real;
  v_cost_after real;
  v_yes_before real;
  v_no_before real;
  v_b real;
  v_odds_before integer;
  v_new_yes real;
  v_new_no real;
  v_bet_id uuid;
  v_distinct_bettors integer;
  v_max real;
begin
  if p_side not in ('yes', 'no') then
    raise exception 'Invalid side: %', p_side;
  end if;
  if p_amount < 50 then
    raise exception 'Minimum bet is 50 credits';
  end if;

  select * into v_market from markets where id = p_market_id for update;
  if v_market is null then raise exception 'Market not found'; end if;
  if v_market.status != 'open' then raise exception 'Market is not open'; end if;
  if v_market.closes_at <= now() then raise exception 'Market has expired'; end if;

  select * into v_profile from profiles where id = p_user_id for update;
  if v_profile is null then raise exception 'User not found'; end if;
  if v_profile.credits < p_amount then raise exception 'Insufficient credits'; end if;

  v_yes_before := v_market.yes_shares;
  v_no_before  := v_market.no_shares;
  v_b          := v_market.liquidity_param;

  v_max := greatest(v_yes_before / v_b, v_no_before / v_b);
  v_odds_before := round(
    100.0 * exp(v_yes_before / v_b - v_max) /
    (exp(v_yes_before / v_b - v_max) + exp(v_no_before / v_b - v_max))
  )::integer;

  v_cost_before := v_b * (v_max + ln(
    exp(v_yes_before / v_b - v_max) + exp(v_no_before / v_b - v_max)
  ));
  v_cost_after := v_cost_before + p_amount;

  if p_side = 'yes' then
    v_shares  := v_b * ln(exp(v_cost_after / v_b) - exp(v_no_before / v_b)) - v_yes_before;
    v_new_yes := v_yes_before + v_shares;
    v_new_no  := v_no_before;
  else
    v_shares  := v_b * ln(exp(v_cost_after / v_b) - exp(v_yes_before / v_b)) - v_no_before;
    v_new_yes := v_yes_before;
    v_new_no  := v_no_before + v_shares;
  end if;

  if v_shares <= 0 then raise exception 'Calculated shares must be positive'; end if;

  insert into bets (market_id, user_id, side, amount, shares, odds_at_time)
  values (p_market_id, p_user_id, p_side, p_amount, v_shares, v_odds_before)
  returning id into v_bet_id;

  select count(distinct user_id) into v_distinct_bettors
  from bets where market_id = p_market_id;

  v_max := greatest(v_new_yes / v_b, v_new_no / v_b);

  update markets set
    yes_shares    = v_new_yes,
    no_shares     = v_new_no,
    yes_odds      = round(100.0 * exp(v_new_yes / v_b - v_max) / (exp(v_new_yes / v_b - v_max) + exp(v_new_no / v_b - v_max)))::integer,
    total_credits = total_credits + p_amount,
    total_yes_credits = total_yes_credits + case when p_side = 'yes' then p_amount else 0 end,
    total_no_credits = total_no_credits + case when p_side = 'no' then p_amount else 0 end,
    total_bettors = v_distinct_bettors
  where id = p_market_id;

  update profiles set credits = credits - p_amount where id = p_user_id;

  insert into credit_transactions (user_id, amount, reason, ref_bet_id, ref_market_id)
  values (p_user_id, -p_amount, 'bet_placed', v_bet_id, p_market_id);

  return jsonb_build_object(
    'betId', v_bet_id,
    'shares', round(v_shares::numeric, 2),
    'cost', p_amount,
    'oddsBeforeBet', v_odds_before,
    'newYesOdds', round(100.0 * exp(v_new_yes / v_b - v_max) / (exp(v_new_yes / v_b - v_max) + exp(v_new_no / v_b - v_max)))::integer
  );
end;
$$ language plpgsql security definer;

create or replace function distribute_payout(
  p_user_id uuid,
  p_amount integer,
  p_bet_id uuid,
  p_market_id uuid
) returns void as $$
begin
  -- Skip if this bet was already paid out (idempotent on retry)
  if exists (
    select 1 from credit_transactions
    where ref_bet_id = p_bet_id and reason = 'bet_won'
  ) then
    return;
  end if;

  update profiles set credits = credits + p_amount where id = p_user_id;
  insert into credit_transactions (user_id, amount, reason, ref_bet_id, ref_market_id)
  values (p_user_id, p_amount, 'bet_won', p_bet_id, p_market_id);
end;
$$ language plpgsql security definer;

create or replace function complete_quest(
  p_user_id uuid,
  p_quest_id text,
  p_reward integer
) returns boolean as $$
begin
  if exists (
    select 1 from user_quest_completions
    where user_id = p_user_id and quest_id = p_quest_id
  ) then
    return false;
  end if;

  insert into user_quest_completions (user_id, quest_id, reward_amount)
  values (p_user_id, p_quest_id, p_reward);

  update profiles set credits = credits + p_reward where id = p_user_id;

  insert into credit_transactions (user_id, amount, reason)
  values (p_user_id, p_reward, 'quest_reward');

  return true;
end;
$$ language plpgsql security definer;

-- -----------------------------------------------------------------------
-- PHASE 6: Storage
-- -----------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "Public read avatars"
  on storage.objects for select using (bucket_id = 'avatars');
create policy "Users upload own avatar"
  on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = name);
create policy "Users update own avatar"
  on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = name);
create policy "Users delete own avatar"
  on storage.objects for delete using (bucket_id = 'avatars' and auth.uid()::text = name);

commit;
