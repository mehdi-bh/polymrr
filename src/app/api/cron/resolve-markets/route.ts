import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { RAKE_PERCENT } from "@/lib/lmsr";

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

  // Phase 2: Resolve closed markets with determinable outcomes
  const { data: pendingMarkets } = await admin
    .from("markets")
    .select("*, startups(*)")
    .eq("status", "closed")
    .is("resolved_outcome", null);

  let resolved = 0;

  for (const market of pendingMarkets ?? []) {
    const outcome = determineOutcome(market);
    if (outcome === null) continue;

    await admin
      .from("markets")
      .update({
        status: "resolved",
        resolved_outcome: outcome,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", market.id);

    await distributePayouts(admin, market.id, outcome, market.total_credits);
    resolved++;
  }

  return NextResponse.json({
    closed: closedMarkets?.length ?? 0,
    resolved,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function determineOutcome(market: any): "yes" | "no" | null {
  const startup = market.startups;
  if (!startup) return null;

  switch (market.type) {
    case "mrr-target": {
      const target = parseMrrTarget(market.resolution_criteria);
      if (target === null) return null;
      return startup.revenue_mrr >= target ? "yes" : "no";
    }
    case "acquisition": {
      return startup.on_sale ? "no" : "yes";
    }
    case "growth-race": {
      const targetGrowth = parseGrowthTarget(market.resolution_criteria);
      if (targetGrowth === null) return null;
      return (startup.growth_30d ?? 0) >= targetGrowth ? "yes" : "no";
    }
    case "survival": {
      const threshold = parseMrrTarget(market.resolution_criteria);
      if (threshold === null) return null;
      return startup.revenue_mrr >= threshold ? "yes" : "no";
    }
    default:
      return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function distributePayouts(admin: any, marketId: string, outcome: "yes" | "no", totalPool: number) {
  const { data: winningBets } = await admin
    .from("bets")
    .select("*")
    .eq("market_id", marketId)
    .eq("side", outcome);

  if (!winningBets || winningBets.length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalWinningShares = winningBets.reduce((sum: number, b: any) => sum + b.shares, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const bet of winningBets) {
    const grossPayout = (bet.shares / totalWinningShares) * totalPool;
    const netPayout = Math.floor(grossPayout * (1 - RAKE_PERCENT));

    await admin.rpc("distribute_payout", {
      p_user_id: bet.user_id,
      p_amount: netPayout,
      p_bet_id: bet.id,
      p_market_id: marketId,
    });
  }
}

function parseMrrTarget(criteria: string): number | null {
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
