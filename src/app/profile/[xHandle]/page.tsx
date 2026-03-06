import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getUserByXHandle,
  getBetsForUser,
  getMarketById,
  getStartupBySlug,
  timeAgo,
} from "@/lib/data";
import { leaderboard } from "@/lib/mock";
import { Credits } from "@/components/ui/credits";
import { Trophy, Target, Flame } from "lucide-react";

interface PageProps {
  params: Promise<{ xHandle: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { xHandle } = await params;
  const user = getUserByXHandle(xHandle);
  if (!user) notFound();

  const userBets = getBetsForUser(user.id);
  const lbEntry = leaderboard.find((e) => e.userId === user.id);
  const activeBets = userBets.filter((b) => getMarketById(b.marketId)?.status === "open");
  const resolvedBets = userBets.filter((b) => getMarketById(b.marketId)?.status === "resolved");

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
              {user.xName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{user.xName}</h1>
              <p className="text-sm font-medium text-primary">@{user.xHandle}</p>
              {lbEntry && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="mono-num font-semibold">{lbEntry.winRate}%</span> accuracy
                  </span>
                  <span className="mono-num">{lbEntry.totalPredictions} predictions</span>
                  <Credits amount={lbEntry.creditsWon} prefix="+" className="font-semibold text-yes" />
                  {lbEntry.currentStreak >= 5 && (
                    <span className="badge badge-warning badge-outline badge-sm gap-1">
                      <Flame className="h-3 w-3" /> {lbEntry.currentStreak} streak
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-base-content/50">Balance</div>
              <Credits amount={user.credits} size="lg" className="font-bold" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {lbEntry && (
        <div className="stats stats-horizontal w-full bg-base-100 border border-base-300 rounded-xl">
          <div className="stat place-items-center py-4">
            <div className="stat-value mono-num text-xl">{lbEntry.winRate}%</div>
            <div className="stat-desc text-[10px] font-semibold uppercase tracking-wider">Win Rate</div>
          </div>
          <div className="stat place-items-center py-4">
            <div className="stat-value mono-num text-xl">{lbEntry.totalPredictions}</div>
            <div className="stat-desc text-[10px] font-semibold uppercase tracking-wider">Predictions</div>
          </div>
          <div className="stat place-items-center py-4">
            <div className="stat-value text-xl text-yes">
              <Credits amount={lbEntry.creditsWon} prefix="+" size="lg" />
            </div>
            <div className="stat-desc text-[10px] font-semibold uppercase tracking-wider">Won</div>
          </div>
          <div className="stat place-items-center py-4">
            <div className="stat-value mono-num text-xl">{lbEntry.currentStreak}</div>
            <div className="stat-desc text-[10px] font-semibold uppercase tracking-wider">Streak</div>
          </div>
        </div>
      )}

      {/* Active Bets */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Active Bets <span className="mono-num text-sm font-normal text-base-content/50">({activeBets.length})</span></h2>
        {activeBets.length > 0 ? (
          <div className="space-y-2">
            {activeBets.map((bet) => {
              const market = getMarketById(bet.marketId);
              const startup = market ? getStartupBySlug(market.startupSlug) : null;
              if (!market || !startup) return null;
              return (
                <Link key={bet.id} href={`/markets/${market.id}`}
                  className="flex items-center justify-between rounded-xl border border-base-300 bg-base-100 p-4 transition-colors hover:bg-base-300/30">
                  <div className="flex items-center gap-3">
                    <span className={`mono-num rounded-lg px-2 py-1 text-[10px] font-bold ${
                      bet.side === "yes" ? "bg-success/10 text-yes" : "bg-error/10 text-no"
                    }`}>{bet.side.toUpperCase()}</span>
                    <div>
                      <div className="text-[13px] font-semibold">{market.question}</div>
                      <div className="text-xs text-base-content/50">{startup.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Credits amount={bet.amount} className="text-sm font-semibold" />
                    <div className="mono-num text-xs text-base-content/50">{timeAgo(bet.createdAt)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-base-content/50">No active bets.</p>
        )}
      </div>

      {/* History */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Bet History <span className="mono-num text-sm font-normal text-base-content/50">({resolvedBets.length})</span></h2>
        {resolvedBets.length > 0 ? (
          <div className="space-y-2">
            {resolvedBets.map((bet) => {
              const market = getMarketById(bet.marketId);
              const startup = market ? getStartupBySlug(market.startupSlug) : null;
              if (!market || !startup) return null;
              const won = market.resolvedOutcome === bet.side;
              return (
                <Link key={bet.id} href={`/markets/${market.id}`}
                  className="flex items-center justify-between rounded-xl border border-base-300 bg-base-100 p-4 transition-colors hover:bg-base-300/30">
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${
                      won ? "bg-success/10 text-yes" : "bg-error/10 text-no"
                    }`}>
                      {won && <Trophy className="h-3 w-3" />}
                      {won ? "WON" : "LOST"}
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold">{market.question}</div>
                      <div className="text-xs text-base-content/50">{startup.name} — {bet.side.toUpperCase()}</div>
                    </div>
                  </div>
                  <Credits amount={bet.amount} className="text-sm font-semibold" />
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-base-content/50">No resolved bets yet.</p>
        )}
      </div>
    </div>
  );
}
