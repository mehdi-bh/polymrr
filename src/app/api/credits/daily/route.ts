import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DAILY_BONUS = 100;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("last_daily_login, credits")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  if (profile.last_daily_login === today) {
    return NextResponse.json({ error: "Already claimed today" }, { status: 409 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      credits: profile.credits + DAILY_BONUS,
      last_daily_login: today,
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("credit_transactions")
    .insert({ user_id: user.id, amount: DAILY_BONUS, reason: "daily_login" });

  return NextResponse.json({ credits: profile.credits + DAILY_BONUS });
}
