-- ============================================================================
-- PolyMRR seed data — realistic with actual bets via place_bet RPC
-- Run AFTER reset.sql. Creates fake auth users + profiles, startups, markets,
-- and places real bets so LMSR state, pools, and odds are all consistent.
-- ============================================================================

-- Step 0: Clean slate (profiles preserved from real auth, fake ones inserted below)
truncate credit_transactions;
truncate bets cascade;
truncate markets cascade;
truncate sync_log;
truncate startup_snapshots;
truncate mrr_history;
truncate startup_tech_stack;
truncate startup_cofounders;
truncate startups cascade;

-- Step 1: Fake auth users + profiles for seed bettors
-- We insert directly into auth.users with minimal fields, then profiles.
-- The trigger will auto-create profiles, but we override credits after.
insert into auth.users (id, email, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
values
  ('b0000000-0000-0000-0000-000000000001', 'alice@seed.local',   '{"full_name":"Alice Chen"}',     now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000002', 'bob@seed.local',     '{"full_name":"Bob Martinez"}',   now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000003', 'charlie@seed.local', '{"full_name":"Charlie Park"}',   now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000004', 'diana@seed.local',   '{"full_name":"Diana Kovacs"}',   now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000005', 'evan@seed.local',    '{"full_name":"Evan Brooks"}',    now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Override profiles with x_handles and enough credits for betting
update profiles set x_handle = 'alice_builds',   x_name = 'Alice Chen',    credits = 50000 where id = 'b0000000-0000-0000-0000-000000000001';
update profiles set x_handle = 'bob_ships',       x_name = 'Bob Martinez',  credits = 50000 where id = 'b0000000-0000-0000-0000-000000000002';
update profiles set x_handle = 'charlie_codes',   x_name = 'Charlie Park',  credits = 50000 where id = 'b0000000-0000-0000-0000-000000000003';
update profiles set x_handle = 'diana_invests',   x_name = 'Diana Kovacs',  credits = 50000 where id = 'b0000000-0000-0000-0000-000000000004';
update profiles set x_handle = 'evan_bets',       x_name = 'Evan Brooks',   credits = 50000 where id = 'b0000000-0000-0000-0000-000000000005';

-- Step 2: Startups
insert into startups (slug, name, description, website, country, founded_date, category, payment_provider, target_audience, revenue_last_30_days, revenue_mrr, revenue_total, customers, active_subscriptions, growth_30d, on_sale, asking_price, multiple, x_handle, x_follower_count) values
  ('shipfast',    'ShipFast',    'Ship your startup in days, not weeks. Next.js boilerplate.',          'https://shipfa.st',       'FR', '2023-06-01', 'developer-tools', 'stripe',       'b2b',  4500000, 4500000, 82000000,  3200, 1100, 0.18,  false, null,      null, 'marc_louvion', 42000),
  ('podsqueeze',  'PodSqueeze',  'AI-powered podcast repurposing tool.',                                'https://podsqueeze.com',  'IT', '2023-03-15', 'ai',              'stripe',       'b2c',  1200000, 1200000, 18000000,   850,  620, 0.12,  false, null,      null, 'tdifrancesco', 15000),
  ('notionforms', 'NotionForms', 'Create forms powered by Notion databases.',                           'https://notionforms.io',  'DE', '2021-11-01', 'no-code',         'lemonsqueezy', 'both',  800000,  800000, 24000000,  2100, 1400, 0.05,  false, null,      null, 'julien_music',  8500),
  ('typingmind',  'TypingMind',  'Better UI for ChatGPT. Custom AI chat with your own API key.',        'https://typingmind.com',  'VN', '2023-02-01', 'ai',              'lemonsqueezy', 'b2c',  3500000, 3500000, 65000000,  8000, 3200, 0.08,  false, null,      null, 'tdinh_me',     28000),
  ('pulsetic',    'Pulsetic',    'Website uptime monitoring with beautiful status pages.',               'https://pulsetic.com',    'RO', '2020-05-01', 'developer-tools', 'stripe',       'b2b',   600000,  600000, 15000000,  1800, 1200, -0.03, true,  18000000, 2.5,  'nicuontheweb',  5200),
  ('screenshotai','ScreenshotAI','Generate website screenshots via API. Zero config, instant results.', 'https://screenshot.ai',   'US', '2023-09-01', 'developer-tools', 'stripe',       'b2b',   350000,  350000,  4200000,   400,  280, 0.25,  false, null,      null, 'danielclemens', 3100),
  ('draftql',     'DraftQL',     'Visual GraphQL query builder for frontend teams.',                    'https://draftql.dev',     'UK', '2024-01-15', 'developer-tools', 'stripe',       'b2b',   150000,  150000,  1500000,   180,  120, 0.35,  false, null,      null, 'draftql_dev',   1200),
  ('churnkey',    'Churnkey',    'Reduce SaaS churn with cancel flows and payment recovery.',           'https://churnkey.co',     'US', '2021-08-01', 'saas',            'stripe',       'b2b',  2800000, 2800000, 52000000,   420,  380, 0.10,  false, null,      null, 'churnkey',     11000),
  ('chatbase',    'Chatbase',    'Custom ChatGPT for your website. Train on your data.',                'https://chatbase.co',     'AE', '2023-01-01', 'ai',              'stripe',       'both', 8000000, 8000000,120000000, 15000, 9500, 0.15,  false, null,      null, 'yaborohovitz', 55000),
  ('analyzee',    'Analyzee',    'Simple analytics for indie hackers. Privacy-first.',                  'https://analyzee.io',     'FR', '2024-03-01', 'analytics',       'polar',        'b2b',    80000,   80000,   320000,    95,   70, 0.42,  false, null,      null, 'analyzee_io',    800);

-- Cofounders
insert into startup_cofounders (startup_slug, x_handle, x_name) values
  ('shipfast',     'marc_louvion',  'Marc Lou'),
  ('podsqueeze',   'tdifrancesco',  'Tibo'),
  ('notionforms',  'julien_music',  'Julien Music'),
  ('typingmind',   'tdinh_me',      'Tony Dinh'),
  ('pulsetic',     'nicuontheweb',  'Nicu Surdu'),
  ('screenshotai', 'danielclemens', 'Daniel Clemens'),
  ('draftql',      'draftql_dev',   'Alex Craft'),
  ('churnkey',     'churnkey',      'Churnkey Team'),
  ('chatbase',     'yaborohovitz',  'Yasser Borohovitz'),
  ('analyzee',     'analyzee_io',   'Lucas Martin');

-- Tech stack
insert into startup_tech_stack (startup_slug, slug, category) values
  ('shipfast',    'nextjs',     'framework'),
  ('shipfast',    'stripe',     'payment'),
  ('shipfast',    'tailwindcss','styling'),
  ('podsqueeze',  'nextjs',     'framework'),
  ('podsqueeze',  'openai',     'ai'),
  ('typingmind',  'react',      'framework'),
  ('typingmind',  'openai',     'ai'),
  ('notionforms', 'svelte',     'framework'),
  ('chatbase',    'nextjs',     'framework'),
  ('chatbase',    'openai',     'ai'),
  ('chatbase',    'stripe',     'payment');

-- MRR history (6 months per startup)
insert into mrr_history (startup_slug, date, mrr) values
  ('shipfast',    '2025-10-01', 2800000), ('shipfast',    '2025-11-01', 3100000), ('shipfast',    '2025-12-01', 3400000), ('shipfast',    '2026-01-01', 3800000), ('shipfast',    '2026-02-01', 4100000), ('shipfast',    '2026-03-01', 4500000),
  ('podsqueeze',  '2025-10-01',  700000), ('podsqueeze',  '2025-11-01',  800000), ('podsqueeze',  '2025-12-01',  900000), ('podsqueeze',  '2026-01-01', 1000000), ('podsqueeze',  '2026-02-01', 1100000), ('podsqueeze',  '2026-03-01', 1200000),
  ('notionforms', '2025-10-01',  650000), ('notionforms', '2025-11-01',  680000), ('notionforms', '2025-12-01',  710000), ('notionforms', '2026-01-01',  740000), ('notionforms', '2026-02-01',  770000), ('notionforms', '2026-03-01',  800000),
  ('typingmind',  '2025-10-01', 2500000), ('typingmind',  '2025-11-01', 2700000), ('typingmind',  '2025-12-01', 2900000), ('typingmind',  '2026-01-01', 3100000), ('typingmind',  '2026-02-01', 3300000), ('typingmind',  '2026-03-01', 3500000),
  ('pulsetic',    '2025-10-01',  680000), ('pulsetic',    '2025-11-01',  670000), ('pulsetic',    '2025-12-01',  650000), ('pulsetic',    '2026-01-01',  640000), ('pulsetic',    '2026-02-01',  620000), ('pulsetic',    '2026-03-01',  600000),
  ('screenshotai','2025-10-01',  150000), ('screenshotai','2025-11-01',  180000), ('screenshotai','2025-12-01',  220000), ('screenshotai','2026-01-01',  260000), ('screenshotai','2026-02-01',  300000), ('screenshotai','2026-03-01',  350000),
  ('draftql',     '2025-10-01',   40000), ('draftql',     '2025-11-01',   55000), ('draftql',     '2025-12-01',   75000), ('draftql',     '2026-01-01',   95000), ('draftql',     '2026-02-01',  120000), ('draftql',     '2026-03-01',  150000),
  ('churnkey',    '2025-10-01', 2100000), ('churnkey',    '2025-11-01', 2200000), ('churnkey',    '2025-12-01', 2350000), ('churnkey',    '2026-01-01', 2500000), ('churnkey',    '2026-02-01', 2650000), ('churnkey',    '2026-03-01', 2800000),
  ('chatbase',    '2025-10-01', 5000000), ('chatbase',    '2025-11-01', 5500000), ('chatbase',    '2025-12-01', 6200000), ('chatbase',    '2026-01-01', 6800000), ('chatbase',    '2026-02-01', 7400000), ('chatbase',    '2026-03-01', 8000000),
  ('analyzee',    '2025-10-01',   10000), ('analyzee',    '2025-11-01',   18000), ('analyzee',    '2025-12-01',   30000), ('analyzee',    '2026-01-01',   45000), ('analyzee',    '2026-02-01',   60000), ('analyzee',    '2026-03-01',   80000);

-- Step 3: Markets (all start at 50/50, pool=0, bettors=0 — bets below will update these)
insert into markets (id, startup_slug, type, question, resolution_criteria, resolution_config, created_by, status, yes_odds, yes_shares, no_shares, liquidity_param, total_credits, total_bettors, created_at, closes_at, resolved_at, resolved_outcome) values
  ('a0000000-0000-0000-0000-000000000001', 'shipfast',     'mrr-target',  'Will ShipFast reach $50k MRR?',            'Resolves YES if ShipFast''s MRR reach or exceed $50k by close date. Data from TrustMRR.',         '{"metric":"mrr","condition":"gte","target":5000000,"dbColumn":"revenue_mrr"}',   null, 'open', 50, 0, 0, 500, 0, 0, '2026-01-15', '2026-06-30', null, null),
  ('a0000000-0000-0000-0000-000000000002', 'chatbase',     'mrr-target',  'Will Chatbase reach $100k MRR?',           'Resolves YES if Chatbase''s MRR reach or exceed $100k by close date. Data from TrustMRR.',        '{"metric":"mrr","condition":"gte","target":10000000,"dbColumn":"revenue_mrr"}',  null, 'open', 50, 0, 0, 500, 0, 0, '2026-01-01', '2026-04-30', null, null),
  ('a0000000-0000-0000-0000-000000000003', 'pulsetic',     'acquisition', 'Will Pulsetic be listed for sale?',        'Resolves YES if Pulsetic''s Listed for Sale be yes by close date. Data from TrustMRR.',           '{"metric":"on_sale","condition":"eq","target":1,"dbColumn":"on_sale"}',          null, 'open', 50, 0, 0, 500, 0, 0, '2026-02-01', '2026-07-01', null, null),
  ('a0000000-0000-0000-0000-000000000004', 'typingmind',   'growth-race', 'Will TypingMind reach 20% 30d Growth?',    'Resolves YES if TypingMind''s 30d Growth reach or exceed 20% by close date. Data from TrustMRR.', '{"metric":"growth_30d","condition":"gte","target":0.2,"dbColumn":"growth_30d"}', null, 'open', 50, 0, 0, 500, 0, 0, '2026-01-01', '2026-04-01', null, null),
  ('a0000000-0000-0000-0000-000000000005', 'draftql',      'survival',    'Will DraftQL maintain above $1.2k MRR?',   'Resolves YES if DraftQL''s MRR reach or exceed $1.2k by close date. Data from TrustMRR.',         '{"metric":"mrr","condition":"gte","target":120000,"dbColumn":"revenue_mrr"}',    null, 'open', 50, 0, 0, 500, 0, 0, '2026-02-15', '2026-12-31', null, null),
  ('a0000000-0000-0000-0000-000000000006', 'podsqueeze',   'mrr-target',  'Will PodSqueeze reach $15k MRR?',          'Resolves YES if PodSqueeze''s MRR reach or exceed $15k by close date. Data from TrustMRR.',       '{"metric":"mrr","condition":"gte","target":1500000,"dbColumn":"revenue_mrr"}',   null, 'open', 50, 0, 0, 500, 0, 0, '2026-01-20', '2026-05-31', null, null),
  ('a0000000-0000-0000-0000-000000000007', 'screenshotai', 'mrr-target',  'Will ScreenshotAI reach $5k MRR?',         'Resolves YES if ScreenshotAI''s MRR reach or exceed $5k by close date. Data from TrustMRR.',      '{"metric":"mrr","condition":"gte","target":500000,"dbColumn":"revenue_mrr"}',    null, 'open', 50, 0, 0, 500, 0, 0, '2026-02-01', '2026-08-31', null, null),
  ('a0000000-0000-0000-0000-000000000008', 'analyzee',     'growth-race', 'Will Analyzee reach $8k MRR?',             'Resolves YES if Analyzee''s MRR reach or exceed $8k by close date. Data from TrustMRR.',          '{"metric":"mrr","condition":"gte","target":800000,"dbColumn":"revenue_mrr"}',    null, 'open', 50, 0, 0, 500, 0, 0, '2026-03-01', '2026-12-31', null, null),
  ('a0000000-0000-0000-0000-000000000009', 'notionforms',  'mrr-target',  'Will NotionForms reach $10k MRR?',         'Resolves YES if NotionForms''s MRR reach or exceed $10k by close date. Data from TrustMRR.',      '{"metric":"mrr","condition":"gte","target":1000000,"dbColumn":"revenue_mrr"}',   null, 'open', 50, 0, 0, 500, 0, 0, '2026-01-10', '2026-09-30', null, null),
  ('a0000000-0000-0000-0000-000000000010', 'churnkey',     'mrr-target',  'Will Churnkey reach $35k MRR?',            'Resolves YES if Churnkey''s MRR reach or exceed $35k by close date. Data from TrustMRR.',         '{"metric":"mrr","condition":"gte","target":3500000,"dbColumn":"revenue_mrr"}',   null, 'open', 50, 0, 0, 500, 0, 0, '2026-01-05', '2026-05-31', null, null);

-- Step 4: Place real bets via place_bet RPC
-- Each call atomically: deducts credits, inserts bet row, updates LMSR state + odds + pool + bettors.
-- Spread across 5 users with varied sides and amounts to create realistic odds.

-- Market 1: ShipFast $50k MRR — bullish consensus (70-75% YES)
select place_bet('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'yes', 800);
select place_bet('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'yes', 500);
select place_bet('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'yes', 300);
select place_bet('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'no',  200);
select place_bet('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'yes', 400);

-- Market 2: Chatbase $100k MRR — split opinion (55-60% YES)
select place_bet('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'yes', 600);
select place_bet('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'no',  500);
select place_bet('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'yes', 300);
select place_bet('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'no',  400);

-- Market 3: Pulsetic acquisition — bearish (40% YES)
select place_bet('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'no',  700);
select place_bet('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'yes', 300);
select place_bet('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'no',  500);

-- Market 4: TypingMind growth — skeptical (35% YES)
select place_bet('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'no',  600);
select place_bet('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'no',  400);
select place_bet('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'yes', 200);

-- Market 5: DraftQL survival — optimistic (65% YES)
select place_bet('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'yes', 500);
select place_bet('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'yes', 300);
select place_bet('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'no',  200);

-- Market 6: PodSqueeze $15k MRR — moderate bullish (60% YES)
select place_bet('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'yes', 400);
select place_bet('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 'no',  250);
select place_bet('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006', 'yes', 150);

-- Market 7: ScreenshotAI $5k MRR — strong bullish (72% YES)
select place_bet('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'yes', 600);
select place_bet('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 'yes', 400);
select place_bet('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000007', 'no',  150);

-- Market 8: Analyzee $8k MRR — high conviction bullish (78% YES)
select place_bet('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008', 'yes', 800);
select place_bet('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000008', 'yes', 500);
select place_bet('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000008', 'no',  200);

-- Market 9: NotionForms $10k MRR — moderate (55% YES)
select place_bet('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000009', 'yes', 300);
select place_bet('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000009', 'no',  250);
select place_bet('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000009', 'yes', 100);

-- Market 10: Churnkey $35k MRR — bullish (68% YES)
select place_bet('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000010', 'yes', 700);
select place_bet('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000010', 'yes', 300);
select place_bet('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000010', 'no',  250);
select place_bet('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000010', 'no',  150);
