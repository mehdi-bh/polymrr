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
import { formatCents } from "@/lib/helpers";
import {
  validateMarketAgainstData,
  wouldResolveImmediately,
  type StartupData,
  type FounderData,
} from "@/lib/market-validation";

const MAX_MARKETS = 30;
const MARKET_MAKER_ID = "c0000000-0000-0000-0000-000000000001";
const SEED_BET_MIN = 100;
const SEED_BET_MAX = 1500;

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function weightedShuffle(items: any[]): any[] {
  const pool = items.map((s) => ({ item: s, weight: (s.x_follower_count ?? 0) + 100 }));
  const result = [];

  while (pool.length > 0) {
    const totalWeight = pool.reduce((sum, w) => sum + w.weight, 0);
    let r = Math.random() * totalWeight;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) { idx = i; break; }
    }
    result.push(pool[idx].item);
    pool.splice(idx, 1);
  }

  return result;
}

/** Round to a nice human-readable milestone in cents */
function niceTarget(cents: number): number {
  // Produce round dollar amounts: $500, $1k, $2.5k, $5k, $10k, $15k, $20k, $25k, $50k, etc.
  if (cents >= 10_000_000) return Math.round(cents / 5_000_000) * 5_000_000;  // $50k increments
  if (cents >= 2_500_000) return Math.round(cents / 2_500_000) * 2_500_000;   // $25k increments
  if (cents >= 1_000_000) return Math.round(cents / 500_000) * 500_000;       // $5k increments
  if (cents >= 100_000) return Math.round(cents / 100_000) * 100_000;         // $1k increments
  if (cents >= 10_000) return Math.round(cents / 50_000) * 50_000;            // $500 increments
  return Math.round(cents / 10_000) * 10_000;                                  // $100 increments
}

function niceRoundCount(n: number): number {
  if (n >= 10_000) return Math.round(n / 5_000) * 5_000;
  if (n >= 1_000) return Math.round(n / 500) * 500;
  if (n >= 100) return Math.round(n / 50) * 50;
  return Math.round(n / 10) * 10;
}

// ---------------------------------------------------------------------------
// Blueprint generation — startup markets
// ---------------------------------------------------------------------------

function generateStartupBlueprints(s: StartupData): MarketBlueprint[] {
  const bps: MarketBlueprint[] = [];
  const mrr = s.revenue_mrr ?? 0;
  const rev30d = s.revenue_last_30_days ?? 0;
  const growth = s.growth_30d ?? 0;

  // --- MRR growth targets ---
  if (mrr > 0) {
    // Optimistic: project 3 months of growth, target ~20-50% above current
    const growthRate = Math.max(growth, 5) / 100;
    const projected3m = mrr * Math.pow(1 + growthRate, 3);
    const optimisticTarget = niceTarget(Math.round(projected3m * 1.2));

    if (optimisticTarget > mrr) {
      bps.push({
        startupSlug: s.slug, metric: "mrr", condition: "gte",
        target: optimisticTarget, closesAt: daysFromNow(90),
        seedSide: "yes", seedAmount: 0,
      });
    }

    // Stretch goal: 6-month horizon, more ambitious
    const projected6m = mrr * Math.pow(1 + growthRate, 6);
    const stretchTarget = niceTarget(Math.round(projected6m * 1.3));
    if (stretchTarget > optimisticTarget && stretchTarget > mrr) {
      bps.push({
        startupSlug: s.slug, metric: "mrr", condition: "gte",
        target: stretchTarget, closesAt: daysFromNow(180),
        seedSide: "yes", seedAmount: 0,
      });
    }
  }

  // --- Bearish: will MRR drop? (only if negative growth) ---
  if (growth < -0.05 && mrr > 0) {
    const dropTarget = niceTarget(Math.round(mrr * 0.7));
    if (dropTarget > 0 && dropTarget < mrr) {
      bps.push({
        startupSlug: s.slug, metric: "mrr", condition: "lte",
        target: dropTarget, closesAt: daysFromNow(90),
        seedSide: "no", seedAmount: 0,
      });
    }
  }

  // --- 30-day revenue target (if meaningfully different from MRR) ---
  if (rev30d > 0 && Math.abs(rev30d - mrr) > mrr * 0.3) {
    const target = niceTarget(Math.round(rev30d * 1.5));
    if (target > rev30d) {
      bps.push({
        startupSlug: s.slug, metric: "revenue_30d", condition: "gte",
        target, closesAt: daysFromNow(90),
        seedSide: "yes", seedAmount: 0,
      });
    }
  }

  // --- Acquisition: will it be listed for sale? (only if NOT already for sale) ---
  if (!s.on_sale) {
    bps.push({
      startupSlug: s.slug, metric: "on_sale", condition: "eq",
      target: 1, closesAt: daysFromNow(180),
      seedSide: "no", seedAmount: 0,
    });
  }

  return bps;
}

// ---------------------------------------------------------------------------
// Blueprint generation — founder markets
// ---------------------------------------------------------------------------

function generateFounderBlueprints(founder: FounderData): MarketBlueprint[] {
  const bps: MarketBlueprint[] = [];
  // Pick a representative startup slug (highest MRR) for the market row
  const sorted = [...founder.startups].sort((a, b) => (b.revenue_mrr ?? 0) - (a.revenue_mrr ?? 0));
  const anchorSlug = sorted[0]?.slug;
  if (!anchorSlug) return bps;

  // --- Total revenue milestone ---
  if (founder.totalRevenue > 0) {
    const target = niceTarget(Math.round(founder.totalRevenue * 1.5));
    if (target > founder.totalRevenue) {
      bps.push({
        startupSlug: anchorSlug, metric: "founder_revenue", condition: "gte",
        target, closesAt: daysFromNow(90),
        seedSide: "yes", seedAmount: 0,
        founderXHandle: founder.x_handle,
      });
    }
  }

  // --- Ship more startups ---
  if (founder.startupCount >= 1) {
    bps.push({
      startupSlug: anchorSlug, metric: "founder_startups", condition: "gte",
      target: founder.startupCount + 1, closesAt: daysFromNow(90),
      seedSide: "no", seedAmount: 0,
      founderXHandle: founder.x_handle,
    });
  }

  // --- Follower milestone ---
  if (founder.maxFollowers > 100) {
    const target = niceRoundCount(Math.round(founder.maxFollowers * 1.5));
    if (target > founder.maxFollowers) {
      bps.push({
        startupSlug: anchorSlug, metric: "founder_followers", condition: "gte",
        target, closesAt: daysFromNow(90),
        seedSide: "yes", seedAmount: 0,
        founderXHandle: founder.x_handle,
      });
    }
  }

  // --- Top startup race (only if 2+ startups) ---
  if (founder.startups.length >= 2) {
    const byRevenue = [...founder.startups].sort((a, b) => (b.revenue_total ?? 0) - (a.revenue_total ?? 0));
    const top = byRevenue[0];
    bps.push({
      startupSlug: top.slug, metric: "founder_top_startup", condition: "eq",
      target: 1, closesAt: daysFromNow(180),
      seedSide: "yes", seedAmount: 0,
      founderXHandle: founder.x_handle,
    });
  }

  return bps;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const admin = createAdminClient();
  const logId = await logSync(admin, "generate_markets", "running");

  const { data: startups } = await admin.from("startups").select("*");
  if (!startups || startups.length === 0) {
    if (logId) await updateSyncLog(admin, logId, "completed", { generated: 0, completed_at: new Date().toISOString() });
    return;
  }

  // Build founder map: x_handle -> FounderData
  const founderMap = new Map<string, FounderData>();
  for (const s of startups) {
    const handle = s.x_handle;
    if (!handle) continue;
    if (!founderMap.has(handle)) {
      founderMap.set(handle, {
        x_handle: handle,
        startups: [],
        totalRevenue: 0,
        startupCount: 0,
        maxFollowers: 0,
      });
    }
    const fd = founderMap.get(handle)!;
    fd.startups.push(s as StartupData);
    fd.totalRevenue += Number(s.revenue_total) || 0;
    fd.startupCount++;
    fd.maxFollowers = Math.max(fd.maxFollowers, Number(s.x_follower_count) || 0);
  }

  // Also include cofounders
  const { data: cofounders } = await admin.from("startup_cofounders").select("startup_slug, x_handle");
  if (cofounders) {
    for (const cf of cofounders) {
      const s = startups.find((st: StartupData) => st.slug === cf.startup_slug);
      if (!s) continue;
      if (!founderMap.has(cf.x_handle)) {
        founderMap.set(cf.x_handle, {
          x_handle: cf.x_handle,
          startups: [],
          totalRevenue: 0,
          startupCount: 0,
          maxFollowers: 0,
        });
      }
      const fd = founderMap.get(cf.x_handle)!;
      // Avoid duplicates if cofounder is also the main x_handle
      if (!fd.startups.some((st) => st.slug === s.slug)) {
        fd.startups.push(s as StartupData);
        fd.totalRevenue += Number(s.revenue_total) || 0;
        fd.startupCount++;
        fd.maxFollowers = Math.max(fd.maxFollowers, Number(s.x_follower_count) || 0);
      }
    }
  }

  // Collect all blueprints with their context
  const candidates: { bp: MarketBlueprint; startup: StartupData; founder?: FounderData }[] = [];

  // Startup markets (weighted shuffle for variety)
  const shuffledStartups = weightedShuffle(startups);
  for (const s of shuffledStartups) {
    const bps = generateStartupBlueprints(s as StartupData);
    const founderData = s.x_handle ? founderMap.get(s.x_handle) : undefined;
    for (const bp of bps) {
      candidates.push({ bp, startup: s as StartupData, founder: founderData });
    }
  }

  // Founder markets (weighted shuffle founders)
  const founders = weightedShuffle(
    Array.from(founderMap.values()).filter((f) => f.startups.length > 0)
  );
  for (const fd of founders) {
    const bps = generateFounderBlueprints(fd);
    const anchor = fd.startups[0];
    for (const bp of bps) {
      candidates.push({ bp, startup: anchor, founder: fd });
    }
  }

  let generated = 0;
  let skipped = 0;
  let invalid = 0;
  let lines: string[] = [];

  if (logId) lines = await updateProgress(admin, logId, 0, MAX_MARKETS, `${startups.length} startups, ${founderMap.size} founders, target: ${MAX_MARKETS} markets`, lines);

  for (const { bp, startup, founder } of candidates) {
    if (generated >= MAX_MARKETS) break;
    if (logId && await isCancelled(admin, logId)) break;

    const metric = METRICS[bp.metric];
    if (!metric || !metric.validConditions.includes(bp.condition)) { invalid++; continue; }

    // Validate market makes logical sense against current data
    const validationError = validateMarketAgainstData(bp, startup, founder);
    if (validationError) {
      console.log(`[generate-markets] SKIP (invalid): ${startup.name} — ${validationError}`);
      invalid++;
      continue;
    }

    // Double-check it wouldn't resolve immediately
    if (wouldResolveImmediately(bp, startup, founder)) {
      console.log(`[generate-markets] SKIP (would resolve immediately): ${startup.name} — ${metric.label}`);
      invalid++;
      continue;
    }

    // Check for duplicates
    if (await findDuplicate(admin, bp)) { skipped++; continue; }

    const startupName = startup.name;
    const { data: market, error } = await admin.from("markets").insert({
      startup_slug: bp.startupSlug,
      type: metric.marketType,
      question: generateQuestion(bp, startupName),
      resolution_criteria: generateCriteria(bp, startupName),
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
      founder_x_handle: bp.founderXHandle ?? null,
    }).select("id").single();

    if (!error && market) {
      // Place seed bet as Market Maker
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
        console.warn(`[generate-markets] Seed bet failed for ${startupName}: ${betError.message}`);
      }

      generated++;
      const typeLabel = bp.founderXHandle ? `founder:${metric.label}` : metric.label;
      const line = `${generated}/${MAX_MARKETS} ${startupName} — ${typeLabel}`;
      if (logId) lines = await updateProgress(admin, logId, generated, MAX_MARKETS, line, lines);
    }
  }

  console.log(`[generate-markets] Done: ${generated} generated, ${skipped} duplicates, ${invalid} invalid`);

  if (logId) {
    await updateSyncLog(admin, logId, "completed", {
      startups: startups.length,
      founders: founderMap.size,
      generated,
      skipped,
      invalid,
      completed_at: new Date().toISOString(),
    });
  }
}

main();
