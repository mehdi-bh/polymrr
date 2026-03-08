-- Add founder market support

-- 1. Add 'founder' to the market type check constraint
alter table markets drop constraint if exists markets_type_check;
alter table markets add constraint markets_type_check
  check (type in ('mrr-target', 'growth-race', 'acquisition', 'survival', 'founder'));

-- 2. Add founder_x_handle column (nullable — only set for founder markets)
alter table markets add column if not exists founder_x_handle text;

-- 3. Index for querying founder markets
create index if not exists idx_markets_founder on markets (founder_x_handle) where founder_x_handle is not null;
