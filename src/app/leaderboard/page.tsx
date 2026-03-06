import { getLeaderboard } from "@/lib/data";
import { LeaderboardClient } from "./leaderboard-client";

export default async function LeaderboardPage() {
  const entries = await getLeaderboard();

  return <LeaderboardClient entries={entries} />;
}
