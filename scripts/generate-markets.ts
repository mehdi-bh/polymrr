/**
 * Auto-generate prediction markets from startup data.
 *
 * Schedule: 4:00 AM UTC daily (via GitHub Actions)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logSync, updateSyncLog, updateProgress, isCancelled } from "@/lib/trustmrr";
import {
  findDuplicate,
  generateQuestion,
  generateCriteria,
  buildResolutionConfig,
  METRICS,
  type MarketBlueprint,
} from "@/lib/market-templates";

const MAX_MARKETS = 30;
const MRR_MILESTONES = [100_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000];
const MARKET_MAKER_ID = "c0000000-0000-0000-0000-000000000001";
const SEED_BET_MIN = 100;
const SEED_BET_MAX = 1500;

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function weightedShuffle(startups: any[]): any[] {
  const pool = startups.map((s) => ({ startup: s, weight: (s.x_follower_count ?? 0) + 100 }));
  const result = [];

  while (pool.length > 0) {
    const totalWeight = pool.reduce((sum, w) => sum + w.weight, 0);
    let r = Math.random() * totalWeight;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) { idx = i; break; }
    }
    result.push(pool[idx].startup);
    pool.splice(idx, 1);
  }

  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateBlueprints(s: any): MarketBlueprint[] {
  const bps: MarketBlueprint[] = [];
  const mrr = s.revenue_mrr ?? 0;
  const customers = s.customers ?? 0;
  const growth = s.growth_30d ?? 0;

  for (const m of MRR_MILESTONES) {
    if (mrr > 0 && mrr >= m * 0.7 && mrr < m) {
      bps.push({ startupSlug: s.slug, metric: "mrr", condition: "gte", target: m, closesAt: daysFromNow(90), seedSide: "yes", seedAmount: 0 });
    }
  }

  if (s.on_sale) {
    bps.push({ startupSlug: s.slug, metric: "on_sale", condition: "eq", target: 1, closesAt: daysFromNow(90), seedSide: "yes", seedAmount: 0 });
  }

  if (growth < -0.1 && mrr > 0) {
    bps.push({ startupSlug: s.slug, metric: "mrr", condition: "gte", target: Math.round(mrr * 0.8), closesAt: daysFromNow(90), seedSide: "no", seedAmount: 0 });
  }

  return bps;
}

async function main() {
  const admin = createAdminClient();
  const logId = await logSync(admin, "generate_markets", "running");

  const { data: startups } = await admin.from("startups").select("*");
  if (!startups) {
    if (logId) await updateSyncLog(admin, logId, "completed", { generated: 0, completed_at: new Date().toISOString() });
    return;
  }

  const shuffled = weightedShuffle(startups);

  let generated = 0;
  let skipped = 0;
  let lines: string[] = [];

  if (logId) lines = await updateProgress(admin, logId, 0, MAX_MARKETS, `${startups.length} startups, target: ${MAX_MARKETS} markets`, lines);

  for (const s of shuffled) {
    if (generated >= MAX_MARKETS) break;
    if (logId && await isCancelled(admin, logId)) break;

    const blueprints = generateBlueprints(s);
    if (blueprints.length === 0) continue;

    for (const bp of blueprints) {
      if (generated >= MAX_MARKETS) break;

      const metric = METRICS[bp.metric];
      if (!metric || !metric.validConditions.includes(bp.condition)) continue;

      if (await findDuplicate(admin, bp)) { skipped++; continue; }

      const { data: market, error } = await admin.from("markets").insert({
        startup_slug: bp.startupSlug,
        type: metric.marketType,
        question: generateQuestion(bp, s.name),
        resolution_criteria: generateCriteria(bp, s.name),
        resolution_config: buildResolutionConfig(bp),
        status: "open",
        yes_odds: 50,
        yes_shares: 0,
        no_shares: 0,
        liquidity_param: 1500,
        total_credits: 0,
        total_bettors: 0,
        closes_at: bp.closesAt,
        created_by: null,
      }).select("id").single();

      if (!error && market) {
        // Place seed bet as Market Maker to bootstrap the pool
        // Linear bias toward lower amounts: use min of two uniform rolls
        const r1 = Math.random();
        const r2 = Math.random();
        const seedAmount = SEED_BET_MIN + Math.floor(Math.min(r1, r2) * (SEED_BET_MAX - SEED_BET_MIN + 1));
        const { error: betError } = await admin.rpc("place_bet", {
          p_market_id: market.id,
          p_user_id: MARKET_MAKER_ID,
          p_side: bp.seedSide,
          p_amount: seedAmount,
        });
        if (betError) {
          console.warn(`[generate-markets] Seed bet failed for ${s.name}: ${betError.message}`);
        }

        generated++;
        const line = `${generated}/${MAX_MARKETS} ${s.name} — ${metric.label}`;
        if (logId) lines = await updateProgress(admin, logId, generated, MAX_MARKETS, line, lines);
      }
    }
  }

  console.log(`[generate-markets] Done: ${generated} generated, ${skipped} skipped`);

  if (logId) {
    await updateSyncLog(admin, logId, "completed", {
      startups: startups.length, generated, skipped,
      completed_at: new Date().toISOString(),
    });
  }
}

main();
