"use client";

import { useState } from "react";
import Link from "next/link";
import { getLeaderboard } from "@/lib/data";
import { Credits } from "@/components/ui/credits";
import { Flame, Trophy } from "lucide-react";

const tabs = [
  { value: "all-time", label: "All Time" },
  { value: "this-month", label: "This Month" },
] as const;

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"all-time" | "this-month">("all-time");
  const entries = getLeaderboard();

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <div className="join">
          {tabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`btn btn-sm join-item ${
                tab === t.value ? "btn-primary" : "btn-ghost"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100">
        <table className="table table-sm">
          <thead>
            <tr className="border-base-300">
              <th className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">Rank</th>
              <th className="text-[10px] font-bold uppercase tracking-wider text-base-content/50">Predictor</th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-base-content/50">Win Rate</th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-base-content/50">Predictions</th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-base-content/50">Won</th>
              <th className="text-right text-[10px] font-bold uppercase tracking-wider text-base-content/50">Lost</th>
              <th className="text-center text-[10px] font-bold uppercase tracking-wider text-base-content/50">Streak</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const rank = i + 1;
              return (
                <tr key={entry.userId} className="border-base-300/50 hover">
                  <td>
                    {rank <= 3 ? (
                      <Trophy className={`h-4 w-4 ${
                        rank === 1 ? "text-yellow-400" : rank === 2 ? "text-zinc-400" : "text-amber-600"
                      }`} />
                    ) : (
                      <span className="mono-num text-base-content/50">{rank}</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/profile/${entry.xHandle}`} className="flex items-center gap-2.5 transition-colors hover:text-primary">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                        {entry.xName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold">{entry.xName}</div>
                        <div className="text-xs text-base-content/50">@{entry.xHandle}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="text-right">
                    <span className={`mono-num font-bold ${entry.winRate >= 70 ? "text-yes" : ""}`}>
                      {entry.winRate}%
                    </span>
                  </td>
                  <td className="text-right mono-num text-base-content/50">
                    {entry.totalPredictions}
                  </td>
                  <td className="text-right font-medium text-yes">
                    <Credits amount={entry.creditsWon} prefix="+" size="xs" />
                  </td>
                  <td className="text-right font-medium text-no">
                    <Credits amount={entry.creditsLost} prefix="-" size="xs" />
                  </td>
                  <td className="text-center">
                    {entry.currentStreak >= 5 ? (
                      <span className="badge badge-warning badge-outline badge-sm gap-1">
                        <Flame className="h-3 w-3" />
                        {entry.currentStreak}
                      </span>
                    ) : (
                      <span className="mono-num text-base-content/50">{entry.currentStreak}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
