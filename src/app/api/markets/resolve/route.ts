import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { resolveMarket, resolveFounderMarket } from "@/lib/market-templates";

const MODERATORS = ["mehdibhaddou"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("x_handle")
    .eq("id", user.id)
    .single();

  if (!profile || !MODERATORS.includes(profile.x_handle)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { marketId, outcome: manualOutcome } = await request.json();
  if (!marketId) {
    return NextResponse.json({ error: "Missing marketId" }, { status: 400 });
  }
  if (manualOutcome && manualOutcome !== "yes" && manualOutcome !== "no") {
    return NextResponse.json({ error: "Outcome must be yes or no" }, { status: 400 });
  }

  // Fetch market with startup data
  const { data: market, error: mErr } = await admin
    .from("markets")
    .select("*, startups(*)")
    .eq("id", marketId)
    .single();

  if (mErr || !market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

  if (market.status === "resolved") {
    return NextResponse.json({ error: "Already resolved" }, { status: 400 });
  }

  // Close the market first if still open
  if (market.status === "open") {
    await admin.from("markets").update({ status: "closed" }).eq("id", marketId);
  }

  // Determine outcome
  let outcome: "yes" | "no" | null = manualOutcome ?? null;

  if (!outcome) {
    const startup = market.startups;
    if (!startup) {
      return NextResponse.json({ error: "Startup not found" }, { status: 404 });
    }

    if (market.resolution_config) {
      if (market.type === "founder" && market.founder_x_handle) {
        const { data: founderStartups } = await admin
          .from("startups")
          .select("*")
          .eq("x_handle", market.founder_x_handle);
        outcome = resolveFounderMarket(market.resolution_config, founderStartups ?? [], market.startup_slug);
      } else {
        outcome = resolveMarket(market.resolution_config, startup);
      }
    }
  }

  if (!outcome) {
    return NextResponse.json({ error: "Could not determine outcome. Pass outcome manually." }, { status: 400 });
  }

  // Distribute payouts
  const { data: winningBets } = await admin
    .from("bets")
    .select("*")
    .eq("market_id", marketId)
    .eq("side", outcome);

  if (winningBets && winningBets.length > 0) {
    const totalWinning = winningBets.reduce((sum: number, b: any) => sum + b.amount, 0);
    for (const bet of winningBets) {
      const payout = Math.floor((bet.amount / totalWinning) * market.total_credits);
      await admin.rpc("distribute_payout", {
        p_user_id: bet.user_id,
        p_amount: payout,
        p_bet_id: bet.id,
        p_market_id: marketId,
      });
    }
  }

  // Mark resolved
  await admin.from("markets").update({
    status: "resolved",
    resolved_outcome: outcome,
    resolved_at: new Date().toISOString(),
  }).eq("id", marketId);

  return NextResponse.json({ ok: true, outcome });
}
