# WS1: Supabase Backend & Data Layer

> Implementation spec for Claude. Execute step-by-step.

---

## Overview

Replace mock data layer with real Supabase backend. This is the foundation -- all other workstreams depend on it.

---

## Step 1: Supabase Client Files

### `src/lib/supabase/server.ts`

Server-side client for Server Components and Server Actions. Uses cookies for auth session.

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

### `src/lib/supabase/client.ts`

Browser client for Client Components.

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### `src/lib/supabase/admin.ts`

Service role client for API routes, cron jobs, webhooks. Bypasses RLS.

```typescript
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

### Environment variables needed

Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<already have>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<already have>
SUPABASE_SERVICE_ROLE_KEY=<get from Supabase dashboard -> Settings -> API>
```

---

## Step 2: Auth Middleware

### `src/middleware.ts`

Refreshes the Supabase auth session on every request. Required for SSR auth to work.

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

---

## Step 3: Database Migration

Run this SQL in Supabase SQL Editor (or as a migration file).

### `supabase/migrations/001_initial_schema.sql`

```sql
-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  x_handle      text unique,
  x_name        text,
  avatar_url    text,
  credits       bigint not null default 1000,
  last_login_at timestamptz,
  joined_at     timestamptz not null default now()
);

create index idx_profiles_x_handle on profiles (x_handle) where x_handle is not null;

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, x_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- STARTUPS (latest TrustMRR snapshot)
-- ============================================================
create table startups (
  slug                     text primary key,
  name                     text not null,
  icon                     text,
  description              text,
  website                  text,
  country                  text,
  founded_date             timestamptz,
  category                 text,
  payment_provider         text not null,
  target_audience          text,
  revenue_last_30_days     bigint not null default 0,
  mrr                      bigint not null default 0,
  revenue_total            bigint not null default 0,
  customers                integer not null default 0,
  active_subscriptions     integer not null default 0,
  asking_price             bigint,
  profit_margin_last_30d   real,
  growth_30d               real,
  multiple                 real,
  on_sale                  boolean not null default false,
  first_listed_for_sale_at timestamptz,
  x_handle                 text,
  x_follower_count         integer,
  is_merchant_of_record    boolean not null default false,
  synced_at                timestamptz not null default now(),
  created_at               timestamptz not null default now()
);

create index idx_startups_category on startups (category);
create index idx_startups_on_sale on startups (on_sale) where on_sale = true;
create index idx_startups_x_handle on startups (x_handle) where x_handle is not null;

-- ============================================================
-- STARTUP NESTED DATA
-- ============================================================
create table startup_tech_stack (
  startup_slug text not null references startups(slug) on delete cascade,
  tech_slug    text not null,
  category     text not null,
  primary key (startup_slug, tech_slug)
);

create table startup_cofounders (
  startup_slug text not null references startups(slug) on delete cascade,
  x_handle     text not null,
  x_name       text,
  primary key (startup_slug, x_handle)
);

-- ============================================================
-- STARTUP SNAPSHOTS (daily historical data)
-- ============================================================
create table startup_snapshots (
  id                   bigint generated always as identity primary key,
  startup_slug         text not null references startups(slug) on delete cascade,
  snapshot_date        date not null,
  mrr                  bigint not null,
  revenue_last_30_days bigint not null,
  revenue_total        bigint not null,
  customers            integer not null,
  active_subscriptions integer not null,
  growth_30d           real,
  on_sale              boolean not null default false,
  asking_price         bigint,
  unique (startup_slug, snapshot_date)
);

create index idx_snapshots_slug_date on startup_snapshots (startup_slug, snapshot_date desc);

-- ============================================================
-- MRR HISTORY (scraped from TrustMRR website)
-- ============================================================
create table mrr_history (
  id           bigint generated always as identity primary key,
  startup_slug text not null references startups(slug) on delete cascade,
  date         date not null,
  mrr          bigint not null,
  unique (startup_slug, date)
);

create index idx_mrr_history_slug_date on mrr_history (startup_slug, date);

-- ============================================================
-- MARKETS
-- ============================================================
create type market_type as enum ('mrr-target', 'growth-race', 'acquisition', 'survival');
create type market_status as enum ('open', 'closed', 'resolved');

create table markets (
  id                  uuid primary key default gen_random_uuid(),
  startup_slug        text not null references startups(slug) on delete cascade,
  type                market_type not null,
  question            text not null,
  resolution_criteria text not null,
  status              market_status not null default 'open',
  -- LMSR state
  yes_shares          real not null default 0,
  no_shares           real not null default 0,
  liquidity_param     real not null default 100,
  -- Denormalized aggregates
  total_credits       bigint not null default 0,
  total_bettors       integer not null default 0,
  -- Timestamps
  created_at          timestamptz not null default now(),
  closes_at           timestamptz not null,
  resolved_at         timestamptz,
  resolved_outcome    text check (resolved_outcome in ('yes', 'no')),
  -- Creator
  created_by          uuid references profiles(id)
);

create index idx_markets_startup on markets (startup_slug);
create index idx_markets_status on markets (status);
create index idx_markets_closes_at on markets (closes_at) where status = 'open';

-- LMSR YES price function
create or replace function market_yes_odds(m markets) returns integer as $$
  select round(
    100.0 * exp(m.yes_shares / m.liquidity_param) /
    (exp(m.yes_shares / m.liquidity_param) + exp(m.no_shares / m.liquidity_param))
  )::integer;
$$ language sql immutable;

-- Convenience view
create or replace view markets_with_odds as
select m.*, market_yes_odds(m) as yes_odds
from markets m;

-- ============================================================
-- BETS
-- ============================================================
create table bets (
  id           uuid primary key default gen_random_uuid(),
  market_id    uuid not null references markets(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  side         text not null check (side in ('yes', 'no')),
  amount       bigint not null check (amount >= 50),
  shares       real not null,
  odds_at_time integer not null,
  created_at   timestamptz not null default now()
);

create index idx_bets_market on bets (market_id, created_at desc);
create index idx_bets_user on bets (user_id, created_at desc);

-- ============================================================
-- CREDIT TRANSACTIONS (ledger)
-- ============================================================
create type credit_tx_type as enum (
  'signup_bonus',
  'daily_login',
  'bet_placed',
  'bet_won',
  'bet_refund',
  'purchase',
  'admin_adjustment'
);

create table credit_transactions (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references profiles(id) on delete cascade,
  type          credit_tx_type not null,
  amount        bigint not null,
  balance_after bigint,
  ref_bet_id    uuid references bets(id),
  ref_market_id uuid references markets(id),
  description   text,
  created_at    timestamptz not null default now()
);

create index idx_credit_tx_user on credit_transactions (user_id, created_at desc);

-- Trigger: keep profiles.credits in sync
create or replace function update_profile_balance()
returns trigger as $$
begin
  update profiles
    set credits = credits + new.amount
    where id = new.user_id;
  new.balance_after := (select credits from profiles where id = new.user_id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_credit_transaction
  before insert on credit_transactions
  for each row execute function update_profile_balance();

-- Insert signup bonus for newly created profiles
-- (called from handle_new_user after profile insert)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, x_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into credit_transactions (user_id, type, amount, description)
  values (new.id, 'signup_bonus', 1000, 'Welcome bonus');
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- PURCHASES
-- ============================================================
create table purchases (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id),
  stripe_session_id text unique,
  stripe_payment_id text unique,
  pack              text not null,
  amount_usd_cents  integer not null,
  credits_granted   integer not null,
  status            text not null default 'pending'
                    check (status in ('pending', 'completed', 'failed', 'refunded')),
  created_at        timestamptz not null default now()
);

-- ============================================================
-- SYNC LOG
-- ============================================================
create table sync_log (
  id              bigint generated always as identity primary key,
  sync_type       text not null,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  startups_synced integer default 0,
  error           text,
  status          text not null default 'running'
                  check (status in ('running', 'completed', 'failed'))
);

-- ============================================================
-- VIEWS
-- ============================================================

-- Feed items (replaces mock feedItems)
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
order by b.created_at desc;

-- Leaderboard (computed from resolved bets)
create or replace view leaderboard as
with user_resolved_bets as (
  select
    b.user_id,
    b.side,
    b.amount,
    b.shares,
    m.resolved_outcome,
    case when b.side = m.resolved_outcome then true else false end as won
  from bets b
  join markets m on m.id = b.market_id
  where m.status = 'resolved'
),
user_stats as (
  select
    user_id,
    count(*) as total_predictions,
    count(*) filter (where won) as wins,
    round(100.0 * count(*) filter (where won) / nullif(count(*), 0)) as win_rate,
    coalesce(sum(amount) filter (where won), 0) as credits_won,
    coalesce(sum(amount) filter (where not won), 0) as credits_lost
  from user_resolved_bets
  group by user_id
)
select
  us.user_id,
  p.x_handle,
  p.x_name,
  p.avatar_url,
  us.win_rate::integer,
  us.total_predictions::integer,
  us.credits_won::bigint,
  us.credits_lost::bigint,
  0 as current_streak
from user_stats us
join profiles p on p.id = us.user_id
order by (us.credits_won - us.credits_lost) desc;

-- ============================================================
-- RLS POLICIES
-- ============================================================
alter table profiles enable row level security;
alter table startups enable row level security;
alter table startup_tech_stack enable row level security;
alter table startup_cofounders enable row level security;
alter table startup_snapshots enable row level security;
alter table mrr_history enable row level security;
alter table markets enable row level security;
alter table bets enable row level security;
alter table credit_transactions enable row level security;
alter table purchases enable row level security;
alter table sync_log enable row level security;

-- Profiles: public read, self update
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- Startups + related: public read only
create policy "startups_select" on startups for select using (true);
create policy "tech_stack_select" on startup_tech_stack for select using (true);
create policy "cofounders_select" on startup_cofounders for select using (true);
create policy "snapshots_select" on startup_snapshots for select using (true);
create policy "mrr_history_select" on mrr_history for select using (true);

-- Markets: public read
create policy "markets_select" on markets for select using (true);

-- Bets: public read (for feed, market pages)
create policy "bets_select" on bets for select using (true);

-- Credit transactions: own only
create policy "credit_tx_select" on credit_transactions for select
  using (auth.uid() = user_id);

-- Purchases: own only
create policy "purchases_select" on purchases for select
  using (auth.uid() = user_id);

-- Sync log: no public access (admin via service role only)
```

---

## Step 4: Auth Callback Route

### `src/app/api/auth/callback/route.ts`

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
```

### Login/Logout helpers

Add to a utility or directly in components:

```typescript
// Sign in with Google
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/api/auth/callback`,
  },
});

// Sign out
await supabase.auth.signOut();
```

---

## Step 5: Mappers

### `src/lib/mappers.ts`

Convert snake_case DB rows to camelCase TypeScript types.

```typescript
import type { Startup, Market, Bet, User, LeaderboardEntry, FeedItem, MrrSnapshot } from "./types";

export function mapStartup(row: any): Startup {
  return {
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    description: row.description,
    website: row.website,
    country: row.country,
    foundedDate: row.founded_date,
    category: row.category,
    paymentProvider: row.payment_provider,
    targetAudience: row.target_audience,
    revenue: {
      last30Days: row.revenue_last_30_days,
      mrr: row.mrr,
      total: row.revenue_total,
    },
    customers: row.customers,
    activeSubscriptions: row.active_subscriptions,
    askingPrice: row.asking_price,
    profitMarginLast30Days: row.profit_margin_last_30d,
    growth30d: row.growth_30d,
    multiple: row.multiple,
    onSale: row.on_sale,
    firstListedForSaleAt: row.first_listed_for_sale_at,
    xHandle: row.x_handle,
    xFollowerCount: row.x_follower_count,
    isMerchantOfRecord: row.is_merchant_of_record,
    techStack: (row.startup_tech_stack ?? []).map((t: any) => ({
      slug: t.tech_slug,
      category: t.category,
    })),
    cofounders: (row.startup_cofounders ?? []).map((c: any) => ({
      xHandle: c.x_handle,
      xName: c.x_name,
    })),
  };
}

export function mapMarket(row: any): Market {
  return {
    id: row.id,
    startupSlug: row.startup_slug,
    type: row.type,
    question: row.question,
    resolutionCriteria: row.resolution_criteria,
    status: row.status,
    yesOdds: row.yes_odds ?? 50, // computed column from view
    totalCredits: row.total_credits,
    totalBettors: row.total_bettors,
    createdAt: row.created_at,
    closesAt: row.closes_at,
    resolvedAt: row.resolved_at,
    resolvedOutcome: row.resolved_outcome,
  };
}

export function mapBet(row: any): Bet {
  return {
    id: row.id,
    marketId: row.market_id,
    userId: row.user_id,
    side: row.side,
    amount: row.amount,
    oddsAtTime: row.odds_at_time,
    createdAt: row.created_at,
  };
}

export function mapUser(row: any): User {
  return {
    id: row.id,
    xHandle: row.x_handle ?? "",
    xName: row.x_name ?? "",
    avatarUrl: row.avatar_url ?? "",
    credits: row.credits,
    joinedAt: row.joined_at,
  };
}

export function mapLeaderboardEntry(row: any): LeaderboardEntry {
  return {
    userId: row.user_id,
    xHandle: row.x_handle ?? "",
    xName: row.x_name ?? "",
    avatarUrl: row.avatar_url ?? "",
    winRate: row.win_rate ?? 0,
    totalPredictions: row.total_predictions ?? 0,
    creditsWon: row.credits_won ?? 0,
    creditsLost: row.credits_lost ?? 0,
    currentStreak: row.current_streak ?? 0,
  };
}

export function mapFeedItem(row: any): FeedItem {
  return {
    id: row.id,
    userXHandle: row.user_x_handle ?? "",
    side: row.side,
    startupName: row.startup_name,
    marketQuestion: row.market_question,
    amount: row.amount,
    createdAt: row.created_at,
  };
}

export function mapMrrSnapshot(row: any): MrrSnapshot {
  return {
    date: row.date,
    mrr: row.mrr,
  };
}
```

---

## Step 6: Rewrite `data.ts`

All functions become `async`. Import `createClient` from `@/lib/supabase/server`. Import mappers. Pure helpers (`formatCents`, `timeAgo`, etc.) stay synchronous and unchanged.

Key patterns:

```typescript
import { createClient } from "@/lib/supabase/server";
import { mapStartup, mapMarket, mapBet, mapUser, mapLeaderboardEntry, mapFeedItem, mapMrrSnapshot } from "./mappers";

// Example: getStartups
export async function getStartups(): Promise<Startup[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("startups")
    .select("*, startup_tech_stack(*), startup_cofounders(*)")
    .order("mrr", { ascending: false });
  return (data ?? []).map(mapStartup);
}

// Example: getCurrentUser
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data ? mapUser(data) : null;
}

// Example: getMarkets (use the view for computed yes_odds)
export async function getMarkets(): Promise<Market[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("markets_with_odds")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapMarket);
}

// Example: getMrrHistory
export async function getMrrHistory(slug: string): Promise<MrrSnapshot[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mrr_history")
    .select("date, mrr")
    .eq("startup_slug", slug)
    .order("date");
  return (data ?? []).map(mapMrrSnapshot);
}

// Example: getPnlHistory (aggregate credit_transactions by day)
export async function getPnlHistory(userId: string): Promise<PnlSnapshot[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("credit_transactions")
    .select("created_at, balance_after")
    .eq("user_id", userId)
    .order("created_at");
  // Group by day, take last balance_after per day
  // ... (implementation in actual code)
}

// getFilteredMarkets -- build query dynamically
export async function getFilteredMarkets(filters: {
  status?: MarketStatus | "closing-soon";
  type?: MarketType;
  category?: TrustMRRCategory;
  sort?: "popular" | "closing-soon" | "newest" | "biggest-pot";
}): Promise<Market[]> {
  const supabase = await createClient();
  let query = supabase.from("markets_with_odds").select("*, startups!inner(category)");

  if (filters.status === "closing-soon") {
    const tenDaysFromNow = new Date(Date.now() + 10 * 86400000).toISOString();
    query = query.eq("status", "open").lte("closes_at", tenDaysFromNow);
  } else if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.category) query = query.eq("startups.category", filters.category);

  switch (filters.sort) {
    case "popular": query = query.order("total_bettors", { ascending: false }); break;
    case "closing-soon": query = query.order("closes_at"); break;
    case "newest": query = query.order("created_at", { ascending: false }); break;
    case "biggest-pot": query = query.order("total_credits", { ascending: false }); break;
    default: query = query.order("closes_at");
  }

  const { data } = await query;
  return (data ?? []).map(mapMarket);
}
```

**Important**: Every page that calls data.ts functions already works as server components. They just need `await` added before each call. The function signatures change from sync to async, so TypeScript will flag all call sites.

---

## Step 7: Update Page Components

Every page file needs `await` added to data calls. Example diff pattern:

```diff
- const markets = getFeaturedMarkets();
+ const markets = await getFeaturedMarkets();
```

Pages to update:
- `src/app/page.tsx`
- `src/app/markets/page.tsx`
- `src/app/markets/[id]/page.tsx`
- `src/app/startups/page.tsx`
- `src/app/startups/[slug]/page.tsx`
- `src/app/leaderboard/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/profile/[xHandle]/page.tsx`

Components that call data.ts directly and need refactoring:
- `MarketCard` -- currently calls `getStartupBySlug` internally. Should receive startup as prop instead, or be made async.
- `StartupCard` -- calls `getMarketsForStartup` and `getStartupSentiment` internally. Same treatment.
- `BetForm` -- calls `getCurrentUser()`. Must receive user as prop from parent server component.
- `LiveFeed` -- calls `getFeedItems()`. Pass data as prop.
- `StatsBar` -- calls `getGlobalStats()`. Pass data as prop.
- `Navbar` -- calls `getCurrentUser()`. Needs to be split or receive user as prop.
- `FounderCard` -- calls `getStartupsByFounder`. Pass data as prop.

---

## Step 8: API Routes

### `src/app/api/profile/route.ts` -- Update X handle

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const xHandle = body.xHandle?.trim().replace(/^@/, "") || null;

  const { error } = await supabase
    .from("profiles")
    .update({ x_handle: xHandle })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
```

### `src/app/api/credits/daily/route.ts` -- Daily login bonus

```typescript
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("last_login_at")
    .eq("id", user.id)
    .single();

  const today = new Date().toISOString().slice(0, 10);
  const lastLogin = profile?.last_login_at?.slice(0, 10);

  if (lastLogin === today) {
    return NextResponse.json({ error: "Already claimed today" }, { status: 400 });
  }

  await admin
    .from("credit_transactions")
    .insert({ user_id: user.id, type: "daily_login", amount: 10, description: "Daily login bonus" });

  await admin
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ ok: true, credits: 10 });
}
```

---

## Step 9: Remove Mock Data

After all pages work with Supabase:
1. Delete `src/lib/mock/` directory
2. Remove mock imports from `data.ts`
3. Verify `npm run build` passes

---

## Verification

1. `npm run build` -- no TypeScript errors
2. Auth: Google sign-in flow works, profile created in DB, 1000 credits granted
3. All pages render (may be empty until TrustMRR sync populates startups)
4. Profile page shows user data from Supabase
5. Daily login bonus works once per day
6. Credit transactions appear in the ledger
