"use client";

import { useState } from "react";
import Link from "next/link";
import { Credits } from "@/components/ui/credits";
import { Pagination } from "@/components/ui/pagination";
import { Crown, Medal, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/types";

const PER_PAGE = 20;

const tabs = [
  { value: "all-time", label: "All Time" },
  { value: "this-month", label: "This Month" },
] as const;

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400/15 ring-2 ring-yellow-400/30">
        <Crown className="h-5 w-5 text-yellow-400" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-400/15 ring-2 ring-zinc-400/30">
        <Medal className="h-5 w-5 text-zinc-400" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600/15 ring-2 ring-amber-600/30">
        <Trophy className="h-5 w-5 text-amber-600" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center">
      <span className="mono-num text-lg font-bold text-base-content/40">{rank}</span>
    </div>
  );
}

function UserAvatar({ entry }: { entry: LeaderboardEntry }) {
  if (entry.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.avatarUrl}
        alt={entry.xName}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full ring-2 ring-base-300 object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary ring-2 ring-primary/20">
      {entry.xName.slice(0, 2).toUpperCase()}
    </div>
  );
}

interface LeaderboardClientProps {
  entries: LeaderboardEntry[];
  page: number;
}

export function LeaderboardClient({ entries, page }: LeaderboardClientProps) {
  const [tab, setTab] = useState<"all-time" | "this-month">("all-time");

  const totalPages = Math.ceil(entries.length / PER_PAGE);
  const paginated = entries.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const rankOffset = (page - 1) * PER_PAGE;

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

      <div className="space-y-2">
        {paginated.map((entry, i) => {
          const rank = rankOffset + i + 1;
          const isPositive = entry.profit > 0;
          const isTop3 = rank <= 3;

          return (
            <Link
              key={entry.userId}
              href={`/profile/${entry.userId}`}
              className={`flex items-center gap-4 rounded-xl border p-4 transition-all hover:scale-[1.01] hover:shadow-lg ${
                isTop3
                  ? "border-primary/20 bg-gradient-to-r from-primary/5 to-transparent"
                  : "border-base-300 bg-base-100 hover:border-base-content/10"
              }`}
            >
              <RankBadge rank={rank} />

              <UserAvatar entry={entry} />

              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{entry.xName}</div>
                {entry.xHandle && (
                  <div className="text-xs text-base-content/50">@{entry.xHandle}</div>
                )}
              </div>

              <div className="flex items-center gap-2 text-right">
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-yes" />
                ) : entry.profit < 0 ? (
                  <TrendingDown className="h-4 w-4 text-no" />
                ) : null}
                <span className={`mono-num text-lg font-bold ${
                  isPositive ? "text-yes" : entry.profit < 0 ? "text-no" : "text-base-content/50"
                }`}>
                  <Credits
                    amount={Math.abs(entry.profit)}
                    prefix={isPositive ? "+" : entry.profit < 0 ? "-" : ""}
                    size="md"
                  />
                </span>
              </div>
            </Link>
          );
        })}

        {paginated.length === 0 && (
          <div className="rounded-xl border border-base-300 bg-base-100 p-12 text-center text-base-content/50">
            No predictions yet. Be the first!
          </div>
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  );
}
