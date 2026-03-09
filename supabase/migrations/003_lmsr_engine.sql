-- LMSR Engine: schema changes + place_bet RPC

-- Add LMSR state columns to markets
alter table markets add column if not exists yes_shares real not null default 0;
alter table markets add column if not exists no_shares real not null default 0;
alter table markets add column if not exists liquidity_param real not null default 1500;

-- Add shares column to bets
alter table bets add column if not exists shares real;

-- Add reference columns to credit_transactions for bet/market tracking
alter table credit_transactions add column if not exists ref_bet_id uuid references bets(id);
alter table credit_transactions add column if not exists ref_market_id uuid references markets(id);

-- Index for faster payout queries
create index if not exists idx_bets_market_side on bets (market_id, side);

-- ---------------------------------------------------------------------------
-- place_bet: atomic RPC for placing a bet via LMSR
-- ---------------------------------------------------------------------------
create or replace function place_bet(
  p_user_id uuid,
  p_market_id uuid,
  p_side text,
  p_amount bigint
) returns jsonb as $$
declare
  v_market markets%rowtype;
  v_profile profiles%rowtype;
  v_shares real;
  v_cost_before real;
  v_cost_after real;
  v_yes_before real;
  v_no_before real;
  v_b real;
  v_odds_before integer;
  v_new_yes real;
  v_new_no real;
  v_bet_id uuid;
  v_distinct_bettors integer;
  v_max real;
begin
  -- Validate side
  if p_side not in ('yes', 'no') then
    raise exception 'Invalid side: %', p_side;
  end if;

  -- Validate amount
  if p_amount < 50 then
    raise exception 'Minimum bet is 50 credits';
  end if;

  -- Lock and fetch market
  select * into v_market from markets where id = p_market_id for update;
  if v_market is null then
    raise exception 'Market not found';
  end if;
  if v_market.status != 'open' then
    raise exception 'Market is not open';
  end if;
  if v_market.closes_at <= now() then
    raise exception 'Market has expired';
  end if;

  -- Lock and fetch user profile
  select * into v_profile from profiles where id = p_user_id for update;
  if v_profile is null then
    raise exception 'User not found';
  end if;
  if v_profile.credits < p_amount then
    raise exception 'Insufficient credits';
  end if;

  -- LMSR calculation
  v_yes_before := v_market.yes_shares;
  v_no_before := v_market.no_shares;
  v_b := v_market.liquidity_param;

  -- Current odds (before bet) using log-sum-exp for stability
  v_max := greatest(v_yes_before / v_b, v_no_before / v_b);
  v_odds_before := round(
    100.0 * exp(v_yes_before / v_b - v_max) /
    (exp(v_yes_before / v_b - v_max) + exp(v_no_before / v_b - v_max))
  )::integer;

  -- Cost function: C(y,n) = b * (max + ln(exp(y/b - max) + exp(n/b - max)))
  v_cost_before := v_b * (v_max + ln(
    exp(v_yes_before / v_b - v_max) + exp(v_no_before / v_b - v_max)
  ));

  -- Target cost after bet
  v_cost_after := v_cost_before + p_amount;

  -- Solve for shares analytically:
  -- C(y+n, no) = cost_after → n = b * ln(exp(cost_after/b) - exp(no/b)) - y
  if p_side = 'yes' then
    v_shares := v_b * ln(
      exp(v_cost_after / v_b) - exp(v_no_before / v_b)
    ) - v_yes_before;
    v_new_yes := v_yes_before + v_shares;
    v_new_no := v_no_before;
  else
    v_shares := v_b * ln(
      exp(v_cost_after / v_b) - exp(v_yes_before / v_b)
    ) - v_no_before;
    v_new_yes := v_yes_before;
    v_new_no := v_no_before + v_shares;
  end if;

  if v_shares <= 0 then
    raise exception 'Calculated shares must be positive';
  end if;

  -- Insert bet
  insert into bets (market_id, user_id, side, amount, shares, odds_at_time)
  values (p_market_id, p_user_id, p_side, p_amount, v_shares, v_odds_before)
  returning id into v_bet_id;

  -- Update market state
  select count(distinct user_id) into v_distinct_bettors
  from bets where market_id = p_market_id;

  -- Compute new odds
  v_max := greatest(v_new_yes / v_b, v_new_no / v_b);

  update markets set
    yes_shares = v_new_yes,
    no_shares = v_new_no,
    yes_odds = round(
      100.0 * exp(v_new_yes / v_b - v_max) /
      (exp(v_new_yes / v_b - v_max) + exp(v_new_no / v_b - v_max))
    )::integer,
    total_credits = total_credits + p_amount,
    total_bettors = v_distinct_bettors
  where id = p_market_id;

  -- Deduct credits
  update profiles set credits = credits - p_amount where id = p_user_id;

  -- Record transaction
  insert into credit_transactions (user_id, amount, reason, ref_bet_id, ref_market_id)
  values (p_user_id, -p_amount, 'bet_placed', v_bet_id, p_market_id);

  -- Return result
  return jsonb_build_object(
    'betId', v_bet_id,
    'shares', round(v_shares::numeric, 2),
    'cost', p_amount,
    'oddsBeforeBet', v_odds_before,
    'newYesOdds', round(
      100.0 * exp(v_new_yes / v_b - v_max) /
      (exp(v_new_yes / v_b - v_max) + exp(v_new_no / v_b - v_max))
    )::integer
  );
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- distribute_payout: credit a user's winnings atomically (idempotent)
-- ---------------------------------------------------------------------------
create or replace function distribute_payout(
  p_user_id uuid,
  p_amount integer,
  p_bet_id uuid,
  p_market_id uuid
) returns void as $$
begin
  -- Skip if this bet was already paid out (idempotent on retry)
  if exists (
    select 1 from credit_transactions
    where ref_bet_id = p_bet_id and reason = 'bet_won'
  ) then
    return;
  end if;

  update profiles set credits = credits + p_amount where id = p_user_id;

  insert into credit_transactions (user_id, amount, reason, ref_bet_id, ref_market_id)
  values (p_user_id, p_amount, 'bet_won', p_bet_id, p_market_id);
end;
$$ language plpgsql security definer;
