import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getUserByXHandle,
  getBetsForUser,
  getMarketById,
  getStartupBySlug,
  getStartupsByFounder,
  formatCents,
  timeAgo,
} from "@/lib/data";
import { leaderboard } from "@/lib/mock";
import { Credits } from "@/components/ui/credits";
import { XIcon } from "@/components/ui/x-icon";
import { Trophy, Target, Flame, Calendar, Layers } from "lucide-react";

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
  const founderStartups = getStartupsByFounder(xHandle);
  const isFounder = founderStartups.length > 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
              {user.xName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{user.xName}</h1>
                {isFounder && (
                  <span className="badge badge-primary badge-sm badge-outline">Founder</span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3">
                <a
                  href={`https://x.com/${user.xHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <XIcon size={14} />
                  @{user.xHandle}
                </a>
                <span className="flex items-center gap-1 text-xs text-base-content/50">
                  <Calendar className="h-3 w-3" />
                  Joined {new Date(user.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-base-content/50">Balance</div>
              <Credits amount={user.credits} size="lg" className="font-bold" />
            </div>
          </div>

          {/* Stats grid */}
          {lbEntry && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-base-200 px-4 py-3 text-center">
                <div className="mono-num text-xl font-bold">{lbEntry.winRate}%</div>
                <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-base-content/50">
                  <Target className="h-3 w-3" />
                  Win Rate
                </div>
              </div>
              <div className="rounded-lg bg-base-200 px-4 py-3 text-center">
                <div className="mono-num text-xl font-bold">{lbEntry.totalPredictions}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-base-content/50">Predictions</div>
              </div>
              <div className="rounded-lg bg-base-200 px-4 py-3 text-center">
                <div className="text-xl text-yes">
                  <Credits amount={lbEntry.creditsWon} prefix="+" size="lg" className="font-bold" />
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-base-content/50">Won</div>
              </div>
              <div className="rounded-lg bg-base-200 px-4 py-3 text-center">
                <div className="mono-num text-xl font-bold flex items-center justify-center gap-1">
                  {lbEntry.currentStreak}
                  {lbEntry.currentStreak >= 5 && <Flame className="h-4 w-4 text-warning" />}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-base-content/50">Streak</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Founder portfolio */}
      {isFounder && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-4 p-5">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/50">
                Portfolio ({founderStartups.length} startup{founderStartups.length !== 1 ? "s" : ""})
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {founderStartups.map((s) => (
                <Link
                  key={s.slug}
                  href={`/startups/${s.slug}`}
                  className="flex items-center justify-between rounded-lg bg-base-200 px-4 py-3 transition-colors hover:bg-base-300/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{s.name}</div>
                      <div className="mono-num text-xs text-base-content/50">{formatCents(s.revenue.mrr)} MRR</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.onSale && (
                      <span className="badge badge-warning badge-xs badge-outline">FOR SALE</span>
                    )}
                    <span className={`mono-num text-xs font-medium ${(s.growth30d ?? 0) >= 0 ? "text-yes" : "text-no"}`}>
                      {s.growth30d !== null ? `${s.growth30d >= 0 ? "+" : ""}${(s.growth30d * 100).toFixed(0)}%` : ""}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
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
