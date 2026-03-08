import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  validateBlueprint,
  findDuplicate,
  generateQuestion,
  generateCriteria,
  buildResolutionConfig,
  isFounderMetric,
  METRICS,
  type MarketBlueprint,
} from "@/lib/market-templates";
import { tryCompleteQuest } from "@/lib/quest-engine";

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Parse body
  let blueprint: MarketBlueprint;
  try {
    blueprint = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate
  const validationError = validateBlueprint(blueprint);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const admin = createAdminClient();

  // For founder markets, verify founder exists in startup_cofounders
  if (isFounderMetric(blueprint.metric) && blueprint.founderXHandle) {
    const { data: cofRows } = await admin
      .from("startup_cofounders")
      .select("x_handle")
      .eq("x_handle", blueprint.founderXHandle)
      .limit(1);
    if (!cofRows || cofRows.length === 0) {
      return NextResponse.json({ error: "Founder not found" }, { status: 404 });
    }
  }

  // Verify startup exists
  const { data: startup } = await admin
    .from("startups")
    .select("slug, name")
    .eq("slug", blueprint.startupSlug)
    .single();

  if (!startup) {
    return NextResponse.json({ error: "Startup not found" }, { status: 404 });
  }

  // Check user has enough credits
  const { data: profile } = await admin
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (!profile || profile.credits < blueprint.seedAmount) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 400 });
  }

  // Check duplicates
  const isDuplicate = await findDuplicate(admin, blueprint);
  if (isDuplicate) {
    return NextResponse.json({ error: "Duplicate market" }, { status: 400 });
  }

  // Build market data
  const metric = METRICS[blueprint.metric];
  const question = generateQuestion(blueprint, startup.name);
  const criteria = generateCriteria(blueprint, startup.name);
  const resolutionConfig = buildResolutionConfig(blueprint);

  // Insert market
  const { data: market, error: insertError } = await admin
    .from("markets")
    .insert({
      startup_slug: blueprint.startupSlug,
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
      closes_at: blueprint.closesAt,
      created_by: user.id,
      founder_x_handle: blueprint.founderXHandle ?? null,
    })
    .select("id")
    .single();

  if (insertError || !market) {
    return NextResponse.json(
      { error: insertError?.message ?? "Failed to create market" },
      { status: 500 }
    );
  }

  // Place seed bet
  const { error: betError } = await admin.rpc("place_bet", {
    p_market_id: market.id,
    p_user_id: user.id,
    p_side: blueprint.seedSide,
    p_amount: blueprint.seedAmount,
  });

  if (betError) {
    // Market created but seed bet failed — still return the market
    return NextResponse.json({ id: market.id, warning: "Seed bet failed: " + betError.message });
  }

  const completedQuests: string[] = [];
  const created = await tryCompleteQuest(admin, user.id, "create-market");
  if (created) completedQuests.push("create-market");

  return NextResponse.json({ id: market.id, completedQuests });
}
