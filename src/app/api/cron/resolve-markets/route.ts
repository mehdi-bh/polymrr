import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { resolveMarket } from "@/lib/market-templates";
import { getOrCreateLogId, updateSyncLog, updateProgress, isCancelled } from "@/lib/trustmrr";

export const maxDuration = 300;

function verifyCron(request: Request) {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const logId = await getOrCreateLogId(admin, request, "resolve_markets");

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
  const errors: string[] = [];
  const pending = pendingMarkets ?? [];
  let lines: string[] = [];

  if (logId) {
    lines = await updateProgress(admin, logId, 0, pending.length, `Closed ${closedMarkets?.length ?? 0} expired markets, ${pending.length} to resolve`, lines);
  }

  for (let i = 0; i < pending.length; i++) {
    if (logId && await isCancelled(admin, logId)) {
      console.log("[resolve-markets] Cancelled by user");
      lines = await updateProgress(admin, logId, i, pending.length, "Cancelled by user", lines);
      break;
    }

    const market = pending[i];
    try {
      const outcome = determineOutcome(market);
      if (outcome === null) {
        const line = `${i + 1}/${pending.length} ${market.id.slice(0, 8)} skipped (undetermined)`;
        if (logId) lines = await updateProgress(admin, logId, i + 1, pending.length, line, lines);
        continue;
      }

      // Distribute payouts BEFORE marking as resolved to avoid
      // partial state where market is "resolved" but payouts missing
      await distributePayouts(admin, market.id, outcome, market.total_credits);

      await admin
        .from("markets")
        .update({
          status: "resolved",
          resolved_outcome: outcome,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", market.id);

      resolved++;
      const line = `${i + 1}/${pending.length} ${market.id.slice(0, 8)} resolved: ${outcome}`;
      if (logId) lines = await updateProgress(admin, logId, i + 1, pending.length, line, lines);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[resolve-markets] ${market.id} FAILED: ${msg}`);
      errors.push(`${market.id}: ${msg}`);
      const line = `${i + 1}/${pending.length} ${market.id.slice(0, 8)} FAILED: ${msg}`;
      if (logId) lines = await updateProgress(admin, logId, i + 1, pending.length, line, lines);
    }
  }

  const summary = {
    closed: closedMarkets?.length ?? 0,
    resolved,
    pending: (pendingMarkets?.length ?? 0) - resolved,
    errors: errors.length > 0 ? errors : undefined,
    completed_at: new Date().toISOString(),
  };

  if (logId) {
    await updateSyncLog(admin, logId, errors.length > 0 ? "partial" : "completed", summary);
  }

  return NextResponse.json(summary);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function determineOutcome(market: any): "yes" | "no" | null {
  const startup = market.startups;
  if (!startup) return null;

  // Structured resolution via resolution_config (new markets)
  if (market.resolution_config) {
    return resolveMarket(market.resolution_config, startup);
  }

  // Legacy fallback for old markets without resolution_config
  return determineLegacyOutcome(market);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function determineLegacyOutcome(market: any): "yes" | "no" | null {
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
  const totalWinningAmount = winningBets.reduce((sum: number, b: any) => sum + b.amount, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const bet of winningBets) {
    const payout = Math.floor((bet.amount / totalWinningAmount) * totalPool);

    await admin.rpc("distribute_payout", {
      p_user_id: bet.user_id,
      p_amount: payout,
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
