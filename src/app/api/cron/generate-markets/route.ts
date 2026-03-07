import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  validateBlueprint,
  findDuplicate,
  generateQuestion,
  generateCriteria,
  buildResolutionConfig,
  METRICS,
  type MarketBlueprint,
} from "@/lib/market-templates";

export const maxDuration = 300;

function verifyCron(request: Request) {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

const MRR_MILESTONES = [100_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000]; // cents
const CUSTOMER_MILESTONES = [50, 100, 500, 1_000, 5_000];

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function POST(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: startups } = await admin.from("startups").select("*");
  if (!startups) return NextResponse.json({ generated: 0 });

  const blueprints: MarketBlueprint[] = [];

  for (const s of startups) {
    const mrr = s.revenue_mrr ?? 0;
    const customers = s.customers ?? 0;
    const growth = s.growth_30d ?? 0;

    // MRR milestone markets
    for (const milestone of MRR_MILESTONES) {
      if (mrr > 0 && mrr >= milestone * 0.7 && mrr < milestone) {
        blueprints.push({
          startupSlug: s.slug,
          metric: "mrr",
          condition: "gte",
          target: milestone,
          closesAt: daysFromNow(90),
          seedSide: "yes",
          seedAmount: 0,
        });
      }
    }

    // Customer milestone markets
    for (const milestone of CUSTOMER_MILESTONES) {
      if (customers > 0 && customers >= milestone * 0.7 && customers < milestone) {
        blueprints.push({
          startupSlug: s.slug,
          metric: "customers",
          condition: "gte",
          target: milestone,
          closesAt: daysFromNow(90),
          seedSide: "yes",
          seedAmount: 0,
        });
      }
    }

    // Acquisition market
    if (s.on_sale) {
      blueprints.push({
        startupSlug: s.slug,
        metric: "on_sale",
        condition: "eq",
        target: 1,
        closesAt: daysFromNow(90),
        seedSide: "yes",
        seedAmount: 0,
      });
    }

    // Survival market (declining startups)
    if (growth < -0.1 && mrr > 0) {
      const threshold = Math.round(mrr * 0.8);
      blueprints.push({
        startupSlug: s.slug,
        metric: "mrr",
        condition: "gte",
        target: threshold,
        closesAt: daysFromNow(90),
        seedSide: "no",
        seedAmount: 0,
      });
    }
  }

  let generated = 0;

  for (const bp of blueprints) {
    // Skip seedAmount validation for system markets
    const metric = METRICS[bp.metric];
    if (!metric) continue;
    if (!metric.validConditions.includes(bp.condition)) continue;

    const isDuplicate = await findDuplicate(admin, bp);
    if (isDuplicate) continue;

    // Look up startup name
    const startup = startups.find((s) => s.slug === bp.startupSlug);
    if (!startup) continue;

    const question = generateQuestion(bp, startup.name);
    const criteria = generateCriteria(bp, startup.name);
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

    if (!error) generated++;
  }

  return NextResponse.json({ generated });
}
