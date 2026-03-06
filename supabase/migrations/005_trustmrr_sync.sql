-- TrustMRR sync infrastructure

-- Track when each startup was last synced
alter table startups add column if not exists synced_at timestamptz;

-- Rich daily snapshots (superset of mrr_history)
create table if not exists startup_snapshots (
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

create index if not exists idx_snapshots_slug_date
  on startup_snapshots (startup_slug, snapshot_date desc);
