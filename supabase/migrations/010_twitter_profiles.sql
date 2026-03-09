-- Twitter profile data fetched from twitterapi.io
-- Keyed on x_handle (lowercase Twitter username).
-- startups.x_follower_count is updated from this table during sync.

create table if not exists twitter_profiles (
  x_handle       text primary key,
  twitter_id     text,
  display_name   text,
  description    text,
  profile_picture text,
  location       text,
  followers      integer not null default 0,
  following      integer not null default 0,
  statuses_count integer not null default 0,
  is_blue_verified boolean not null default false,
  unavailable    boolean not null default false,
  created_at_twitter text,          -- twitter account creation date (string from API)
  synced_at      timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
