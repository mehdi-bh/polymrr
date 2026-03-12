-- Promo slots: paid promotional placements on the homepage
create table promo_slots (
  id serial primary key,
  slot_index smallint not null unique,
  user_id uuid references auth.users(id) on delete set null,
  startup_slug text references startups(slug) on delete set null,
  custom_name text,
  custom_icon text,
  custom_website text,
  tagline text not null default '',
  font text not null default 'inconsolata',
  color text not null default '#f59e0b',
  payment_method text not null check (payment_method in ('stripe', 'bananas')),
  stripe_session_id text unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table promo_slots enable row level security;

-- Anyone can read active slots
create policy "Active slots public read" on promo_slots
  for select using (status = 'active');

-- Owner can read own slots (any status)
create policy "Owner can read own" on promo_slots
  for select using (auth.uid() = user_id);

-- Atomic banana purchase: check credits, deduct, claim slot
create or replace function purchase_promo_slot(
  p_user_id uuid,
  p_slot_index smallint,
  p_startup_slug text,
  p_custom_name text,
  p_custom_icon text,
  p_custom_website text,
  p_tagline text,
  p_font text,
  p_color text
) returns int language plpgsql security definer as $$
declare
  v_credits int;
  v_slot_id int;
begin
  -- Lock the user row
  select credits into v_credits from profiles where id = p_user_id for update;
  if v_credits < 100000 then
    raise exception 'Insufficient credits';
  end if;

  -- Check slot availability
  if exists (
    select 1 from promo_slots
    where slot_index = p_slot_index and status in ('active', 'pending')
  ) then
    raise exception 'Slot not available';
  end if;

  -- Deduct credits
  update profiles set credits = credits - 100000 where id = p_user_id;

  -- Insert slot
  insert into promo_slots (slot_index, user_id, startup_slug, custom_name, custom_icon, custom_website, tagline, font, color, payment_method, status, expires_at)
  values (p_slot_index, p_user_id, p_startup_slug, p_custom_name, p_custom_icon, p_custom_website, p_tagline, p_font, p_color, 'bananas', 'active', now() + interval '1 month')
  on conflict (slot_index) do update set
    user_id = excluded.user_id,
    startup_slug = excluded.startup_slug,
    custom_name = excluded.custom_name,
    custom_icon = excluded.custom_icon,
    custom_website = excluded.custom_website,
    tagline = excluded.tagline,
    font = excluded.font,
    color = excluded.color,
    payment_method = excluded.payment_method,
    status = excluded.status,
    expires_at = excluded.expires_at,
    updated_at = now()
  returning id into v_slot_id;

  -- Log credit transaction
  insert into credit_transactions (user_id, amount, reason)
  values (p_user_id, -100000, 'promo_slot');

  return v_slot_id;
end;
$$;

-- Storage bucket for custom promo icons
-- Run this in Supabase SQL Editor:
-- insert into storage.buckets (id, name, public) values ('promo-icons', 'promo-icons', true);
-- create policy "Anyone can read promo icons" on storage.objects for select using (bucket_id = 'promo-icons');
-- create policy "Authenticated users can upload promo icons" on storage.objects for insert with check (bucket_id = 'promo-icons' and auth.role() = 'authenticated');
