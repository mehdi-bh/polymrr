-- Truncate everything except profiles (preserves user accounts)
-- Order: children before parents (FK constraints)
truncate credit_transactions;
truncate bets cascade;
truncate markets cascade;
truncate sync_log;
truncate startup_snapshots;
truncate mrr_history;
truncate startup_tech_stack;
truncate startup_cofounders;
truncate startups cascade;
