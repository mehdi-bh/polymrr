-- System "Market Maker" user that places initial seed bets on auto-generated markets.
-- Uses a fixed UUID so the generate-markets script can reference it.

insert into auth.users (id, email, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
values (
  'c0000000-0000-0000-0000-000000000001',
  'market-maker@polymrr.system',
  '{"full_name":"Market Maker"}',
  now(), now(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated'
) on conflict (id) do nothing;

-- Override the auto-created profile with a recognizable name and large credit pool
update profiles set
  x_name = 'Market Maker',
  x_handle = null,
  credits = 999999999
where id = 'c0000000-0000-0000-0000-000000000001';
