import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQuest } from "@/lib/quests";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questId } = await request.json();
  const quest = getQuest(questId);
  if (!quest) {
    return NextResponse.json({ error: "Unknown quest" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: completed, error } = await admin.rpc("complete_quest", {
    p_user_id: user.id,
    p_quest_id: quest.id,
    p_reward: quest.reward,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!completed) {
    return NextResponse.json({ alreadyCompleted: true });
  }

  // Fetch updated credits
  const { data: profile } = await admin
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    completed: true,
    questId: quest.id,
    reward: quest.reward,
    credits: profile?.credits ?? 0,
  });
}
