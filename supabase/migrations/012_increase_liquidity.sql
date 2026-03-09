-- Increase liquidity_param from 500 to 1500 so odds don't swing as aggressively.
-- A 500-credit bet from 50/50 now lands ~60/40 instead of ~82/18.

-- Update all open markets to the new default
update markets set liquidity_param = 1500 where status = 'open' and liquidity_param = 500;

-- Update column default for any future manual inserts
alter table markets alter column liquidity_param set default 1500;
