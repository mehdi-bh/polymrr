import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCurrentUser,
  getUserById,
  getBetsForUser,
  getMarketById,
  getStartupBySlug,
  getStartupsByFounder,
  getLeaderboard,
  getGoogleAvatarUrl,
  formatCents,
  timeAgo,
} from "@/lib/data";
import { Credits } from "@/components/ui/credits";
import { XIcon } from "@/components/ui/x-icon";
import { EditableAvatar, EditableName, EditableXHandle } from "@/components/profile/profile-settings";
import { Trophy, Target, Calendar, Layers } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;
  const [user, currentUser, googleAvatarUrl] = await Promise.all([
    getUserById(id),
    getCurrentUser(),
    getGoogleAvatarUrl(),
  ]);
  if (!user) notFound();

  const isOwnProfile = currentUser?.id === user.id;

  const [userBets, leaderboard, founderStartups] = await Promise.all([
    getBetsForUser(user.id),
    getLeaderboard(),
    user.xHandle ? getStartupsByFounder(user.xHandle) : Promise.resolve([]),
  ]);

  const lbEntry = leaderboard.find((e) => e.userId === user.id);

  const marketCache = new Map<string, Awaited<ReturnType<typeof getMarketById>>>();
  const startupCache = new Map<string, Awaited<ReturnType<typeof getStartupBySlug>>>();

  for (const b of userBets) {
    if (!marketCache.has(b.marketId)) {
      marketCache.set(b.marketId, await getMarketById(b.marketId));
    }
    const market = marketCache.get(b.marketId);
    if (market && !startupCache.has(market.startupSlug)) {
      startupCache.set(market.startupSlug, await getStartupBySlug(market.startupSlug));
    }
  }

  const activeBets = userBets.filter((b) => marketCache.get(b.marketId)?.status === "open");
  const resolvedBets = userBets.filter((b) => marketCache.get(b.marketId)?.status === "resolved");
  const isFounder = founderStartups.length > 0;

  const profit = lbEntry ? lbEntry.creditsWon - lbEntry.creditsLost : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header card */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-0 p-6">
          <div className="flex items-start gap-4">
            {isOwnProfile ? (
              <EditableAvatar user={user} googleAvatarUrl={googleAvatarUrl} />
            ) : user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.xName} className="h-14 w-14 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                {user.xName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <EditableName user={user} />
                ) : (
                  <h1 className="text-xl font-bold truncate">{user.xName}</h1>
                )}
                {isFounder && (
                  <span className="badge badge-primary badge-sm badge-outline">Founder</span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3">
                {isOwnProfile ? (
                  <EditableXHandle user={user} />
                ) : user.xHandle ? (
                  <a
                    href={`https://x.com/${user.xHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <XIcon size={14} />
                    @{user.xHandle}
                  </a>
                ) : (
                  <span className="text-sm text-base-content/40">No X account linked</span>
                )}
                <span className="flex items-center gap-1 text-xs text-base-content/40">
                  <Calendar className="h-3 w-3" />
                  {new Date(user.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Profit */}
          <div className="mt-6">
            <div className="flex items-baseline gap-2 mb-4">
              <Credits amount={Math.abs(profit)} prefix={profit >= 0 ? "+" : "-"} size="lg" className={`text-2xl font-black ${profit >= 0 ? "text-yes" : "text-no"}`} />
              <span className="text-sm text-base-content/50">profit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {lbEntry && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body items-center gap-1 p-4">
              <div className="mono-num text-2xl font-bold">{lbEntry.winRate}%</div>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                <Target className="h-3 w-3" />
                Accuracy
              </div>
            </div>
          </div>
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body items-center gap-1 p-4">
              <div className="mono-num text-2xl font-bold">{lbEntry.totalPredictions}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Predictions</div>
            </div>
          </div>
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body items-center gap-1 p-4">
              <div className="text-yes">
                <Credits amount={lbEntry.creditsWon} prefix="+" size="lg" className="font-bold" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Won</div>
            </div>
          </div>
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body items-center gap-1 p-4">
              <div className="text-no">
                <Credits amount={lbEntry.creditsLost} prefix="-" size="lg" className="font-bold" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Lost</div>
            </div>
          </div>
        </div>
      )}

      {/* Founder portfolio */}
      {isFounder && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body gap-4 p-5">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/40">
                Startups ({founderStartups.length})
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
        <h2 className="text-lg font-bold">
          Active Bets <span className="mono-num text-sm font-normal text-base-content/50">({activeBets.length})</span>
        </h2>
        {activeBets.length > 0 ? (
          <div className="space-y-2">
            {activeBets.map((bet) => {
              const market = marketCache.get(bet.marketId);
              const startup = market ? startupCache.get(market.startupSlug) : null;
              if (!market || !startup) return null;
              return (
                <Link
                  key={bet.id}
                  href={`/markets/${market.id}`}
                  className="flex items-center justify-between rounded-xl border border-base-300 bg-base-100 p-4 transition-colors hover:bg-base-300/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                      {startup.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`mono-num rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          bet.side === "yes" ? "bg-success/10 text-yes" : "bg-error/10 text-no"
                        }`}>{bet.side.toUpperCase()}</span>
                        <span className="text-[13px] font-semibold">{market.question}</span>
                      </div>
                      <div className="text-xs text-base-content/50 mt-0.5">{startup.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Credits amount={bet.amount} className="text-sm font-semibold" />
                    <div className="mono-num text-xs text-base-content/40">{timeAgo(bet.createdAt)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-base-content/50">No active bets.</p>
        )}
      </div>

      {/* Bet History */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">
          Bet History <span className="mono-num text-sm font-normal text-base-content/50">({resolvedBets.length})</span>
        </h2>
        {resolvedBets.length > 0 ? (
          <div className="space-y-2">
            {resolvedBets.map((bet) => {
              const market = marketCache.get(bet.marketId);
              const startup = market ? startupCache.get(market.startupSlug) : null;
              if (!market || !startup) return null;
              const won = market.resolvedOutcome === bet.side;
              return (
                <Link
                  key={bet.id}
                  href={`/markets/${market.id}`}
                  className="flex items-center justify-between rounded-xl border border-base-300 bg-base-100 p-4 transition-colors hover:bg-base-300/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                      {startup.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          won ? "bg-success/10 text-yes" : "bg-error/10 text-no"
                        }`}>
                          {won && <Trophy className="h-3 w-3" />}
                          {won ? "WON" : "LOST"}
                        </span>
                        <span className="text-[13px] font-semibold">{market.question}</span>
                      </div>
                      <div className="text-xs text-base-content/50 mt-0.5">{startup.name} — {bet.side.toUpperCase()}</div>
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
