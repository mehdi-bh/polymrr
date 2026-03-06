-- ============================================================================
-- PolyMRR seed data
-- Run this AFTER schema + LMSR migrations and AFTER you've signed in once.
-- Replace YOUR_USER_ID below with your actual profile id from the profiles table.
-- ============================================================================

-- Step 0: Clean slate
truncate credit_transactions cascade;
truncate bets cascade;
truncate markets cascade;
truncate mrr_history cascade;
truncate startup_tech_stack cascade;
truncate startup_cofounders cascade;
truncate startups cascade;
-- Note: profiles are NOT truncated (tied to auth.users)

-- Step 1: Set your user id here (run: select id from profiles limit 1;)
do $$ begin raise notice 'Make sure to replace YOUR_USER_ID with your real profile UUID'; end $$;

-- Startups
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

-- MRR history (6 months per startup, monthly snapshots)
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

-- Markets with LMSR state
-- All markets start fresh: pool=0, bettors=0, odds at 50/50
-- Initial odds are set by the LMSR starting state (yes_shares=0, no_shares=0 → 50%)
-- A market maker account should place initial bets to set desired starting odds
-- b = 500 (liquidity_param) for all markets
insert into markets (id, startup_slug, type, question, resolution_criteria, status, yes_odds, yes_shares, no_shares, liquidity_param, total_credits, total_bettors, created_at, closes_at, resolved_at, resolved_outcome) values
  ('a0000000-0000-0000-0000-000000000001', 'shipfast',     'mrr-target',  'Will ShipFast hit $50k MRR by June 2026?',              'TrustMRR verified MRR >= $50,000 on June 30.',          'open',     50, 0, 0, 500, 0, 0, '2026-01-15', '2026-06-30', null, null),
  ('a0000000-0000-0000-0000-000000000002', 'chatbase',     'mrr-target',  'Will Chatbase hit $100k MRR by April 2026?',             'TrustMRR verified MRR >= $100,000 on April 30.',        'open',     50, 0, 0, 500, 0, 0, '2026-01-01', '2026-04-30', null, null),
  ('a0000000-0000-0000-0000-000000000003', 'pulsetic',     'acquisition', 'Will Pulsetic be acquired before July 2026?',            'Public announcement of completed acquisition.',          'open',     50, 0, 0, 500, 0, 0, '2026-02-01', '2026-07-01', null, null),
  ('a0000000-0000-0000-0000-000000000004', 'typingmind',   'growth-race', 'Will TypingMind grow faster than Chatbase this quarter?', 'Compare Q1 2026 growth rates via TrustMRR.',            'open',     50, 0, 0, 500, 0, 0, '2026-01-01', '2026-04-01', null, null),
  ('a0000000-0000-0000-0000-000000000005', 'draftql',      'survival',    'Will DraftQL still be active in December 2026?',         'TrustMRR shows revenue > $0 in Dec 2026.',              'open',     50, 0, 0, 500, 0, 0, '2026-02-15', '2026-12-31', null, null),
  ('a0000000-0000-0000-0000-000000000006', 'podsqueeze',   'mrr-target',  'Will PodSqueeze hit $15k MRR by May 2026?',              'TrustMRR verified MRR >= $15,000 on May 31.',           'open',     50, 0, 0, 500, 0, 0, '2026-01-20', '2026-05-31', null, null),
  ('a0000000-0000-0000-0000-000000000007', 'screenshotai', 'mrr-target',  'Will ScreenshotAI hit $5k MRR by August 2026?',          'TrustMRR verified MRR >= $5,000 on Aug 31.',            'open',     50, 0, 0, 500, 0, 0, '2026-02-01', '2026-08-31', null, null),
  ('a0000000-0000-0000-0000-000000000008', 'analyzee',     'growth-race', 'Will Analyzee 10x its MRR by end of 2026?',              'TrustMRR verified MRR >= $8,000 on Dec 31.',            'open',     50, 0, 0, 500, 0, 0, '2026-03-01', '2026-12-31', null, null),
  ('a0000000-0000-0000-0000-000000000009', 'notionforms',  'mrr-target',  'Will NotionForms hit $10k MRR by Q3 2026?',              'TrustMRR verified MRR >= $10,000 on Sep 30.',           'open',     50, 0, 0, 500, 0, 0, '2026-01-10', '2026-09-30', null, null),
  ('a0000000-0000-0000-0000-000000000010', 'churnkey',     'mrr-target',  'Will Churnkey hit $35k MRR by May 2026?',                'TrustMRR verified MRR >= $35,000 on May 31.',           'open',     50, 0, 0, 500, 0, 0, '2026-01-05', '2026-05-31', null, null),
  -- 2 resolved markets for history (these keep non-zero pools since they represent completed markets)
  ('a0000000-0000-0000-0000-000000000011', 'shipfast',     'mrr-target',  'Did ShipFast hit $40k MRR by Jan 2026?',                 'TrustMRR verified MRR >= $40,000 on Jan 31.',           'resolved', 80, 693.1, 0, 500, 25000, 60, '2025-07-01', '2026-01-31', '2026-02-01', 'yes'),
  ('a0000000-0000-0000-0000-000000000012', 'chatbase',     'mrr-target',  'Did Chatbase hit $90k MRR by Dec 2025?',                 'TrustMRR verified MRR >= $90,000 on Dec 31.',           'resolved', 65, 309.5, 0, 500, 20000, 48, '2025-06-01', '2025-12-31', '2026-01-02', 'no');

-- Bets (reference your real user -- replace the UUID below)
-- Uncomment and replace YOUR_USER_ID with your actual profile id:
--
-- insert into bets (market_id, user_id, side, amount, shares, odds_at_time, created_at) values
--   ('a0000000-0000-0000-0000-000000000001', 'YOUR_USER_ID', 'yes', 200, 180.5, 70, '2026-02-10 14:30:00+00'),
--   ('a0000000-0000-0000-0000-000000000002', 'YOUR_USER_ID', 'yes', 500, 420.3, 82, '2026-02-12 09:15:00+00'),
--   ('a0000000-0000-0000-0000-000000000003', 'YOUR_USER_ID', 'no',  150, 185.2, 40, '2026-02-20 16:45:00+00'),
--   ('a0000000-0000-0000-0000-000000000004', 'YOUR_USER_ID', 'yes', 300, 285.7, 48, '2026-02-25 11:00:00+00'),
--   ('a0000000-0000-0000-0000-000000000011', 'YOUR_USER_ID', 'yes', 400, 320.1, 75, '2025-10-15 13:00:00+00'),
--   ('a0000000-0000-0000-0000-000000000012', 'YOUR_USER_ID', 'yes', 250, 220.6, 60, '2025-09-20 10:30:00+00');
