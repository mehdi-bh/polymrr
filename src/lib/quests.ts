// ---------------------------------------------------------------------------
// Quest registry — add new quests here.
// Completions are tracked in the `user_quest_completions` DB table.
// ---------------------------------------------------------------------------

export interface QuestDefinition {
  id: string;
  label: string;
  reward: number; // credits to grant on completion
  icon: string; // lucide icon name
}

// Registry of all quests. Order here = display order in UI.
export const QUESTS: QuestDefinition[] = [
  { id: "signup", label: "Sign up to PolyMRR", reward: 10000, icon: "UserPlus" },
  { id: "first-bet", label: "Place your first bet", reward: 1000, icon: "Target" },
  { id: "underdog-bet", label: "Bet on a <30% outcome", reward: 1000, icon: "Flame" },
  { id: "create-market", label: "Create a market", reward: 1000, icon: "PlusCircle" },
];

export const QUEST_MAP = new Map(QUESTS.map((q) => [q.id, q]));

export function getQuest(id: string): QuestDefinition | undefined {
  return QUEST_MAP.get(id);
}
