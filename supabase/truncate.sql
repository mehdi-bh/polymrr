-- Truncate everything except profiles
-- Order matters: children before parents (FK constraints)
truncate bets cascade;
truncate credit_transactions;
truncate markets cascade;
truncate mrr_history;
truncate startup_tech_stack;
truncate startup_cofounders;
truncate startups cascade;
truncate sync_log;
