import type { Metadata } from "next";
import { getLeaderboard } from "@/lib/data";
import { LeaderboardClient } from "./leaderboard-client";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "See who's the best at predicting startup outcomes. Top bettors ranked by accuracy and profit.",
  alternates: { canonical: "/leaderboard" },
};

interface Props {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const entries = await getLeaderboard();

  return <LeaderboardClient entries={entries} page={page} />;
}
