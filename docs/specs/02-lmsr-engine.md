# WS2: LMSR Prediction Market Engine

> Implementation spec for Claude. Execute step-by-step.

---

## Overview

Implement the Logarithmic Market Scoring Rule (LMSR) for PolyMRR's prediction markets. This handles pricing, bet execution, and market resolution with payout distribution.

---

## LMSR Theory (what you need to know)

LMSR uses a **cost function** to price shares. The market maker always provides liquidity -- users don't need counterparties.

### Key concepts

- **Shares**: When you bet, you buy shares (YES or NO). Shares pay out 1 credit each if that outcome wins, 0 if it loses.
- **Liquidity parameter `b`**: Controls how sensitive odds are to bets. Higher `b` = more stable odds (requires more money to move them). We use `b = 100` as default.
- **Cost function**: `C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))`
  - `q_yes` = total outstanding YES shares
  - `q_no` = total outstanding NO shares
- **Price of a share** (instantaneous): `p_yes = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))`
- **Cost to buy `n` shares of YES**: `C(q_yes + n, q_no) - C(q_yes, q_no)`
  - This is what the user pays in credits
- **Inverse**: Given credits `c` to spend, solve for shares `n`:
  `n = b * ln(e^((c/b) + ln(e^(q_yes/b) + e^(q_no/b))) - e^(q_no/b)) - q_yes`

### How payouts work

When a market resolves:
1. Each winning share pays out from the total pool
2. Payout per winning share = `total_pool / total_winning_shares`
3. Platform takes 5% rake: actual payout = `payout * 0.95`
4. Losing shares pay out 0

### Example

```
Market starts: q_yes=0, q_no=0, b=100
YES price = e^0 / (e^0 + e^0) = 0.50 (50%)

User A buys 50 credits of YES:
  Cost = 100 * ln(e^(n/100) + e^0) - 100 * ln(e^0 + e^0)
  Solve: n = ~48.5 shares for 50 credits
  New state: q_yes=48.5, q_no=0
  New YES price = e^(48.5/100) / (e^(48.5/100) + e^0) = ~61.9%

User B buys 100 credits of NO:
  Cost = ... solve for shares
  New state: q_yes=48.5, q_no=~85.2
  New YES price = ~40.8%
```

---

## Step 1: LMSR Math Library

### `src/lib/lmsr.ts`

Pure TypeScript functions. No database access.

```typescript
/**
 * LMSR (Logarithmic Market Scoring Rule) implementation.
 *
 * State: { yesShares, noShares, b }
 *   yesShares: total outstanding YES shares
 *   noShares: total outstanding NO shares
 *   b: liquidity parameter (higher = more stable odds)
 */

export interface LmsrState {
  yesShares: number;
  noShares: number;
  b: number;
}

/** Cost function: C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b)) */
export function costFunction(qYes: number, qNo: number, b: number): number {
  // Use log-sum-exp trick for numerical stability
  const max = Math.max(qYes / b, qNo / b);
  return b * (max + Math.log(Math.exp(qYes / b - max) + Math.exp(qNo / b - max)));
}

/** Instantaneous price of YES shares (0 to 1) */
export function yesPrice(state: LmsrState): number {
  const { yesShares, noShares, b } = state;
  const max = Math.max(yesShares / b, noShares / b);
  const expYes = Math.exp(yesShares / b - max);
  const expNo = Math.exp(noShares / b - max);
  return expYes / (expYes + expNo);
}

/** Instantaneous price of NO shares (0 to 1) */
export function noPrice(state: LmsrState): number {
  return 1 - yesPrice(state);
}

/** YES odds as integer 0-100 */
export function yesOdds(state: LmsrState): number {
  return Math.round(yesPrice(state) * 100);
}

/**
 * Cost to buy `numShares` of a given side.
 * Returns the number of credits the user must pay.
 */
export function costToBuy(
  state: LmsrState,
  side: "yes" | "no",
  numShares: number
): number {
  const { yesShares, noShares, b } = state;
  const newYes = side === "yes" ? yesShares + numShares : yesShares;
  const newNo = side === "no" ? noShares + numShares : noShares;
  return costFunction(newYes, newNo, b) - costFunction(yesShares, noShares, b);
}

/**
 * Given credits to spend, calculate how many shares the user gets.
 * Uses binary search for robustness.
 */
export function sharesToBuy(
  state: LmsrState,
  side: "yes" | "no",
  credits: number
): number {
  // Binary search: find n such that costToBuy(state, side, n) = credits
  let lo = 0;
  let hi = credits * 10; // Upper bound (shares can't cost less than ~0 each)
  const epsilon = 0.001;

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const cost = costToBuy(state, side, mid);
    if (Math.abs(cost - credits) < epsilon) return mid;
    if (cost < credits) lo = mid;
    else hi = mid;
  }

  return (lo + hi) / 2;
}

/**
 * Calculate the new state after a bet.
 */
export function stateAfterBet(
  state: LmsrState,
  side: "yes" | "no",
  shares: number
): LmsrState {
  return {
    yesShares: side === "yes" ? state.yesShares + shares : state.yesShares,
    noShares: side === "no" ? state.noShares + shares : state.noShares,
    b: state.b,
  };
}

/** Default liquidity parameter for new markets */
export const DEFAULT_LIQUIDITY = 100;

/** Platform rake on winnings (5%) */
export const RAKE_PERCENT = 0.05;

/** Minimum bet in credits */
export const MIN_BET = 50;
```

---

## Step 2: Place Bet -- Postgres RPC Function

This must be atomic. A single Postgres function handles the entire bet flow.

### Add to migration SQL:

```sql
-- Place a bet atomically
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
  v_odds_before integer;
  v_new_yes real;
  v_new_no real;
  v_bet_id uuid;
  v_distinct_bettors integer;
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

  -- Calculate LMSR shares using binary search equivalent in SQL
  -- Cost function: C(y,n) = b * ln(exp(y/b) + exp(n/b))
  v_yes_before := v_market.yes_shares;
  v_no_before := v_market.no_shares;

  -- Current odds (before bet)
  v_odds_before := round(
    100.0 * exp(v_yes_before / v_market.liquidity_param) /
    (exp(v_yes_before / v_market.liquidity_param) + exp(v_no_before / v_market.liquidity_param))
  )::integer;

  -- Calculate shares: solve for n where cost(state + n) - cost(state) = amount
  -- Using the analytical inverse:
  -- For YES: n = b * ln(exp((amount + C_before) / b) - exp(q_no/b)) * b - q_yes
  -- Simplified: use iterative approach
  v_cost_before := v_market.liquidity_param * ln(
    exp(v_yes_before / v_market.liquidity_param) +
    exp(v_no_before / v_market.liquidity_param)
  );

  -- Target cost after
  v_cost_after := v_cost_before + p_amount;

  -- Solve for shares analytically
  if p_side = 'yes' then
    -- C(y+n, no) = cost_after
    -- b * ln(exp((y+n)/b) + exp(no/b)) = cost_after
    -- exp((y+n)/b) + exp(no/b) = exp(cost_after/b)
    -- exp((y+n)/b) = exp(cost_after/b) - exp(no/b)
    -- y+n = b * ln(exp(cost_after/b) - exp(no/b))
    -- n = b * ln(exp(cost_after/b) - exp(no/b)) - y
    v_shares := v_market.liquidity_param * ln(
      exp(v_cost_after / v_market.liquidity_param) -
      exp(v_no_before / v_market.liquidity_param)
    ) - v_yes_before;
    v_new_yes := v_yes_before + v_shares;
    v_new_no := v_no_before;
  else
    v_shares := v_market.liquidity_param * ln(
      exp(v_cost_after / v_market.liquidity_param) -
      exp(v_yes_before / v_market.liquidity_param)
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

  update markets set
    yes_shares = v_new_yes,
    no_shares = v_new_no,
    total_credits = total_credits + p_amount,
    total_bettors = v_distinct_bettors
  where id = p_market_id;

  -- Deduct credits via ledger
  insert into credit_transactions (user_id, type, amount, ref_bet_id, ref_market_id, description)
  values (p_user_id, 'bet_placed', -p_amount, v_bet_id, p_market_id,
    'Bet ' || p_amount || 'cr on ' || upper(p_side));

  -- Return result
  return jsonb_build_object(
    'betId', v_bet_id,
    'shares', v_shares,
    'oddsBeforeBet', v_odds_before,
    'newYesOdds', round(
      100.0 * exp(v_new_yes / v_market.liquidity_param) /
      (exp(v_new_yes / v_market.liquidity_param) + exp(v_new_no / v_market.liquidity_param))
    )::integer
  );
end;
$$ language plpgsql security definer;
```

---

## Step 3: Bet API Route

### `src/app/api/bets/route.ts`

```typescript
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  const body = await request.json();
  const { marketId, side, amount } = body;

  if (!marketId || !side || !amount) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (side !== "yes" && side !== "no") {
    return NextResponse.json({ error: "Side must be yes or no" }, { status: 400 });
  }
  if (typeof amount !== "number" || amount < 50) {
    return NextResponse.json({ error: "Minimum bet is 50 credits" }, { status: 400 });
  }

  // Call the atomic RPC function
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("place_bet", {
    p_user_id: user.id,
    p_market_id: marketId,
    p_side: side,
    p_amount: amount,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
```

---

## Step 4: Refactor BetForm Component

The `BetForm` currently calls `getCurrentUser()` synchronously. Refactor:

1. Parent server component fetches user and passes as prop
2. BetForm calls `POST /api/bets` on submit
3. On success, refresh the page (or use `router.refresh()`)

```typescript
// In BetForm (client component):
const handleBet = async () => {
  const res = await fetch("/api/bets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marketId, side, amount }),
  });
  const data = await res.json();
  if (!res.ok) {
    setError(data.error);
    return;
  }
  // Success: show confirmation, refresh odds
  router.refresh();
};
```

---

## Step 5: Market Resolution Cron

### `src/app/api/cron/resolve-markets/route.ts`

Called daily by Vercel cron. Two phases:
1. Close expired markets (closes_at <= now)
2. Resolve closed markets where we can determine the outcome

```typescript
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Verify this is called by Vercel cron
function verifyCron(request: Request) {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Phase 1: Close expired markets
  const { data: closedMarkets } = await admin
    .from("markets")
    .update({ status: "closed" })
    .eq("status", "open")
    .lte("closes_at", new Date().toISOString())
    .select("id");

  // Phase 2: Resolve closed markets
  const { data: pendingMarkets } = await admin
    .from("markets")
    .select("*, startups(*)")
    .eq("status", "closed")
    .is("resolved_outcome", null);

  let resolved = 0;

  for (const market of pendingMarkets ?? []) {
    const outcome = await determineOutcome(admin, market);
    if (outcome === null) continue; // Can't determine yet

    // Set resolved
    await admin
      .from("markets")
      .update({
        status: "resolved",
        resolved_outcome: outcome,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", market.id);

    // Distribute payouts
    await distributePayouts(admin, market.id, outcome);
    resolved++;
  }

  return NextResponse.json({
    closed: closedMarkets?.length ?? 0,
    resolved,
  });
}

async function determineOutcome(admin: any, market: any): Promise<"yes" | "no" | null> {
  const startup = market.startups;

  switch (market.type) {
    case "mrr-target": {
      // Parse target MRR from resolution_criteria
      // Check latest startup snapshot
      const target = parseMrrTarget(market.resolution_criteria);
      if (target === null) return null;
      return startup.mrr >= target ? "yes" : "no";
    }
    case "acquisition": {
      // Check if startup was sold (onSale went from true to false, or asking_price changed)
      // This is a simplification -- real logic may need more nuance
      return startup.on_sale ? "no" : "yes";
    }
    case "growth-race": {
      const targetGrowth = parseGrowthTarget(market.resolution_criteria);
      if (targetGrowth === null) return null;
      return (startup.growth_30d ?? 0) >= targetGrowth ? "yes" : "no";
    }
    case "survival": {
      // Check if MRR is above threshold
      const threshold = parseSurvivalThreshold(market.resolution_criteria);
      if (threshold === null) return null;
      return startup.mrr >= threshold ? "yes" : "no";
    }
    default:
      return null;
  }
}

async function distributePayouts(admin: any, marketId: string, outcome: "yes" | "no") {
  // Get all bets on the winning side
  const { data: winningBets } = await admin
    .from("bets")
    .select("*")
    .eq("market_id", marketId)
    .eq("side", outcome);

  if (!winningBets || winningBets.length === 0) return;

  // Get total pool
  const { data: market } = await admin
    .from("markets")
    .select("total_credits")
    .eq("id", marketId)
    .single();

  const totalPool = market.total_credits;
  const totalWinningShares = winningBets.reduce((sum: number, b: any) => sum + b.shares, 0);

  // Payout each winner
  for (const bet of winningBets) {
    const grossPayout = (bet.shares / totalWinningShares) * totalPool;
    const netPayout = Math.floor(grossPayout * (1 - 0.05)); // 5% rake

    await admin
      .from("credit_transactions")
      .insert({
        user_id: bet.user_id,
        type: "bet_won",
        amount: netPayout,
        ref_bet_id: bet.id,
        ref_market_id: marketId,
        description: `Won ${netPayout}cr (${outcome.toUpperCase()} resolved)`,
      });
  }
}

// Helper parsers for resolution criteria
// These parse the human-readable criteria string to extract numeric targets
function parseMrrTarget(criteria: string): number | null {
  // Match patterns like "$10,000" or "$10k" or "$1M"
  const match = criteria.match(/\$[\d,.]+[kKmM]?/);
  if (!match) return null;
  const str = match[0].replace(/[$,]/g, "");
  let value = parseFloat(str);
  if (/[kK]$/.test(str)) value *= 1000;
  if (/[mM]$/.test(str)) value *= 1000000;
  return value * 100; // Convert to cents
}

function parseGrowthTarget(criteria: string): number | null {
  const match = criteria.match(/([\d.]+)%/);
  if (!match) return null;
  return parseFloat(match[1]) / 100;
}

function parseSurvivalThreshold(criteria: string): number | null {
  return parseMrrTarget(criteria);
}
```

---

## Step 6: Vercel Cron Config

### `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/resolve-markets",
      "schedule": "0 0 * * *"
    }
  ]
}
```

(Other cron entries for WS3 and WS4 will be added to this file.)

---

## Step 7: System-Generated Markets

When TrustMRR sync runs (WS3), it should also create markets automatically based on rules from the product spec. Add this as a function called at the end of the daily sync:

```typescript
async function generateSystemMarkets(admin: SupabaseClient, startups: any[]) {
  for (const startup of startups) {
    // Check if there's already an open MRR target market for this startup
    const { data: existing } = await admin
      .from("markets")
      .select("id")
      .eq("startup_slug", startup.slug)
      .eq("type", "mrr-target")
      .eq("status", "open")
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Create MRR target: next round number above current MRR
    const currentMrr = startup.mrr / 100; // cents to dollars
    const target = nextRoundNumber(currentMrr);
    const closesAt = new Date(Date.now() + 90 * 86400000).toISOString(); // 3 months

    await admin.from("markets").insert({
      startup_slug: startup.slug,
      type: "mrr-target",
      question: `Will ${startup.name} reach $${formatTarget(target)} MRR by ${formatDate(closesAt)}?`,
      resolution_criteria: `Resolves YES if MRR >= $${formatTarget(target)} on ${formatDate(closesAt)} per TrustMRR verified data.`,
      closes_at: closesAt,
      liquidity_param: 100,
    });

    // If startup listed for sale, create acquisition market
    if (startup.on_sale) {
      const { data: acqExisting } = await admin
        .from("markets")
        .select("id")
        .eq("startup_slug", startup.slug)
        .eq("type", "acquisition")
        .eq("status", "open")
        .limit(1);

      if (!acqExisting || acqExisting.length === 0) {
        const acqClosesAt = new Date(Date.now() + 90 * 86400000).toISOString();
        await admin.from("markets").insert({
          startup_slug: startup.slug,
          type: "acquisition",
          question: `Will ${startup.name} be sold within 90 days?`,
          resolution_criteria: `Resolves YES if ${startup.name} is no longer listed for sale on TrustMRR by ${formatDate(acqClosesAt)}.`,
          closes_at: acqClosesAt,
          liquidity_param: 100,
        });
      }
    }
  }
}

function nextRoundNumber(mrr: number): number {
  if (mrr < 1000) return 1000;
  if (mrr < 5000) return 5000;
  if (mrr < 10000) return 10000;
  if (mrr < 25000) return 25000;
  if (mrr < 50000) return 50000;
  if (mrr < 100000) return 100000;
  // Above 100k, next 50k increment
  return Math.ceil(mrr / 50000) * 50000;
}
```

---

## Verification

1. Place a bet via the UI: odds should shift, credits deducted, bet appears in market feed
2. Place multiple bets on both sides: odds converge correctly
3. Verify LMSR math: `yesPrice + noPrice = 1` always
4. Resolve a market manually (set status=closed in DB, run cron): winners credited
5. Check credit ledger: all transactions recorded, balance_after correct
6. `npm run build` passes
