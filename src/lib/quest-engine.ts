// ---------------------------------------------------------------------------
// Quest engine — server-side helper for completing quests.
// Called from API routes after qualifying actions.
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import { getQuest } from "./quests";

/**
 * Try to complete a quest for a user. Returns true if newly completed,
 * false if already completed or quest doesn't exist. Idempotent.
 */
export async function tryCompleteQuest(
  admin: SupabaseClient,
  userId: string,
  questId: string
): Promise<boolean> {
  const quest = getQuest(questId);
  if (!quest) return false;

  const { data, error } = await admin.rpc("complete_quest", {
    p_user_id: userId,
    p_quest_id: quest.id,
    p_reward: quest.reward,
  });

  if (error) {
    console.error(`Quest completion failed [${questId}]:`, error.message);
    return false;
  }

  return data === true;
}
