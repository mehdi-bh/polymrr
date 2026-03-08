/**
 * Close expired markets and resolve outcomes with payout distribution.
 *
 * Schedule: midnight UTC daily (via GitHub Actions)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMarket } from "@/lib/market-templates";
import { logSync, updateSyncLog, updateProgress, isCancelled } from "@/lib/trustmrr";

function parseMrrTarget(criteria: string): number | null {
  const match = criteria.match(/\$[\d,.]+[kKmM]?/);
  if (!match) return null;
  const str = match[0].replace(/[$,]/g, "");
  let value = parseFloat(str);
  if (/[kK]$/.test(str)) value *= 1000;
  if (/[mM]$/.test(str)) value *= 1000000;
  return value * 100;
}

function parseGrowthTarget(criteria: string): number | null {
  const match = criteria.match(/([\d.]+)%/);
  if (!match) return null;
  return parseFloat(match[1]) / 100;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function determineOutcome(market: any): "yes" | "no" | null {
  const startup = market.startups;
  if (!startup) return null;

  if (market.resolution_config) {
    return resolveMarket(market.resolution_config, startup);
  }

  // Legacy fallback
  switch (market.type) {
    case "mrr-target": {
      const target = parseMrrTarget(market.resolution_criteria);
      if (target === null) return null;
      return startup.revenue_mrr >= target ? "yes" : "no";
    }
    case "acquisition":
      return startup.on_sale ? "no" : "yes";
    case "growth-race": {
      const target = parseGrowthTarget(market.resolution_criteria);
      if (target === null) return null;
      return (startup.growth_30d ?? 0) >= target ? "yes" : "no";
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
  const totalWinning = winningBets.reduce((sum: number, b: any) => sum + b.amount, 0);

  for (const bet of winningBets) {
    const payout = Math.floor((bet.amount / totalWinning) * totalPool);
    await admin.rpc("distribute_payout", {
      p_user_id: bet.user_id,
      p_amount: payout,
      p_bet_id: bet.id,
      p_market_id: marketId,
    });
  }
}

async function main() {
  const admin = createAdminClient();
  const logId = await logSync(admin, "resolve_markets", "running");

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
  const errors: string[] = [];
  const pending = pendingMarkets ?? [];
  let lines: string[] = [];

  if (logId) {
    lines = await updateProgress(admin, logId, 0, pending.length, `Closed ${closedMarkets?.length ?? 0} expired, ${pending.length} to resolve`, lines);
  }

  for (let i = 0; i < pending.length; i++) {
    if (logId && await isCancelled(admin, logId)) break;

    const market = pending[i];
    try {
      const outcome = determineOutcome(market);
      if (outcome === null) {
        if (logId) lines = await updateProgress(admin, logId, i + 1, pending.length, `${market.id.slice(0, 8)} skipped`, lines);
        continue;
      }

      await distributePayouts(admin, market.id, outcome, market.total_credits);
      await admin.from("markets").update({
        status: "resolved",
        resolved_outcome: outcome,
        resolved_at: new Date().toISOString(),
      }).eq("id", market.id);

      resolved++;
      if (logId) lines = await updateProgress(admin, logId, i + 1, pending.length, `${market.id.slice(0, 8)} resolved: ${outcome}`, lines);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${market.id}: ${msg}`);
      if (logId) lines = await updateProgress(admin, logId, i + 1, pending.length, `${market.id.slice(0, 8)} FAILED: ${msg}`, lines);
    }
  }

  console.log(`[resolve-markets] Done: closed=${closedMarkets?.length ?? 0}, resolved=${resolved}`);

  if (logId) {
    await updateSyncLog(admin, logId, errors.length > 0 ? "partial" : "completed", {
      closed: closedMarkets?.length ?? 0,
      resolved,
      pending: pending.length - resolved,
      errors: errors.length > 0 ? errors : undefined,
      completed_at: new Date().toISOString(),
    });
  }
}

main();
