import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  findDuplicate,
  generateQuestion,
  generateCriteria,
  buildResolutionConfig,
  METRICS,
  type MarketBlueprint,
} from "@/lib/market-templates";
import { getOrCreateLogId, updateSyncLog, updateProgress, isCancelled } from "@/lib/trustmrr";

export const maxDuration = 300;

const MAX_MARKETS = 30;
const MRR_MILESTONES = [100_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000]; // cents
const CUSTOMER_MILESTONES = [50, 100, 500, 1_000, 5_000];

function verifyCron(request: Request) {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Weighted shuffle: higher-follower startups are more likely to appear first, but with randomness */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function weightedShuffle(startups: any[]): any[] {
  // Weight = follower count + baseline so everyone has a chance
  const weighted = startups.map((s) => ({
    startup: s,
    weight: (s.x_follower_count ?? 0) + 100,
  }));

  const result = [];
  const pool = [...weighted];

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

/** Generate blueprints for a single startup */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateBlueprints(s: any): MarketBlueprint[] {
  const bps: MarketBlueprint[] = [];
  const mrr = s.revenue_mrr ?? 0;
  const customers = s.customers ?? 0;
  const growth = s.growth_30d ?? 0;

  for (const milestone of MRR_MILESTONES) {
    if (mrr > 0 && mrr >= milestone * 0.7 && mrr < milestone) {
      bps.push({ startupSlug: s.slug, metric: "mrr", condition: "gte", target: milestone, closesAt: daysFromNow(90), seedSide: "yes", seedAmount: 0 });
    }
  }

  for (const milestone of CUSTOMER_MILESTONES) {
    if (customers > 0 && customers >= milestone * 0.7 && customers < milestone) {
      bps.push({ startupSlug: s.slug, metric: "customers", condition: "gte", target: milestone, closesAt: daysFromNow(90), seedSide: "yes", seedAmount: 0 });
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

export async function GET(request: Request) { return handler(request); }
export async function POST(request: Request) { return handler(request); }

async function handler(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const logId = await getOrCreateLogId(admin, request, "generate_markets");

  const { data: startups } = await admin.from("startups").select("*");
  if (!startups) {
    if (logId) await updateSyncLog(admin, logId, "completed", { generated: 0, startups: 0, completed_at: new Date().toISOString() });
    return NextResponse.json({ generated: 0 });
  }

  // Prioritize startups with famous founders (high X follower count), with randomization
  const shuffled = weightedShuffle(startups);

  let generated = 0;
  let checked = 0;
  let skipped = 0;
  let lines: string[] = [];

  if (logId) {
    lines = await updateProgress(admin, logId, 0, MAX_MARKETS, `${startups.length} startups (weighted by founder followers), target: ${MAX_MARKETS} markets`, lines);
  }

  for (const s of shuffled) {
    if (generated >= MAX_MARKETS) break;

    if (logId && await isCancelled(admin, logId)) {
      lines = await updateProgress(admin, logId, generated, MAX_MARKETS, "Cancelled by user", lines);
      break;
    }

    const blueprints = generateBlueprints(s);
    if (blueprints.length === 0) continue;

    const followers = s.x_follower_count ?? 0;

    for (const bp of blueprints) {
      if (generated >= MAX_MARKETS) break;
      checked++;

      const metric = METRICS[bp.metric];
      if (!metric || !metric.validConditions.includes(bp.condition)) continue;

      const isDuplicate = await findDuplicate(admin, bp);
      if (isDuplicate) { skipped++; continue; }

      const question = generateQuestion(bp, s.name);
      const criteria = generateCriteria(bp, s.name);
      const resolutionConfig = buildResolutionConfig(bp);

      const { error } = await admin.from("markets").insert({
        startup_slug: bp.startupSlug,
        type: metric.marketType,
        question,
        resolution_criteria: criteria,
        resolution_config: resolutionConfig,
        status: "open",
        yes_odds: 50,
        yes_shares: 0,
        no_shares: 0,
        liquidity_param: 500,
        total_credits: 0,
        total_bettors: 0,
        closes_at: bp.closesAt,
        created_by: null,
      });

      if (!error) {
        generated++;
        const line = `${generated}/${MAX_MARKETS} ${s.name} — ${metric.label} (${followers.toLocaleString()} followers)`;
        if (logId) lines = await updateProgress(admin, logId, generated, MAX_MARKETS, line, lines);
      }
    }
  }

  const summary = {
    startups: startups.length,
    checked,
    skipped,
    generated,
    completed_at: new Date().toISOString(),
  };

  if (logId) await updateSyncLog(admin, logId, "completed", summary);

  return NextResponse.json(summary);
}
