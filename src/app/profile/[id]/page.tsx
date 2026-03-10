import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
import { daysUntil } from "@/lib/helpers";
import { Credits } from "@/components/ui/credits";
import { XIcon } from "@/components/ui/x-icon";
import { OddsBar } from "@/components/market/odds-bar";
import { EditableAvatar, EditableName, EditableXHandle } from "@/components/profile/profile-settings";
import { FounderAvatar } from "@/components/founder/founder-avatar";
import { Trophy, Target, Calendar, Layers, ArrowRight, TrendingUp, History, Pencil } from "lucide-react";

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

  const profit = lbEntry?.profit ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Profile header */}
      <div className="card bg-base-100 border border-base-300 max-w-xl mx-auto">
        <div className="card-body p-6">
          <div className="flex flex-col items-center text-center gap-3">
            {isOwnProfile ? (
              <EditableAvatar user={user} googleAvatarUrl={googleAvatarUrl} />
            ) : user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.xName} className="h-18 w-18 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
                {user.xName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center gap-2.5">
                {isOwnProfile ? (
                  <EditableName user={user} />
                ) : (
                  <h1 className="text-2xl font-bold truncate">{user.xName}</h1>
                )}
              </div>
              <div className="mt-1 flex items-center justify-center gap-3">
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
              </div>
            </div>
          </div>

          {/* Stats row */}
          {lbEntry && (
            <div className="mt-5 flex items-center justify-center gap-6 border-t border-base-300 pt-5">
              <div className="text-center">
                <Credits amount={Math.abs(profit)} prefix={profit >= 0 ? "+" : "-"} size="lg" className={`text-2xl font-black ${profit >= 0 ? "text-yes" : "text-no"}`} />
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-base-content/40 mt-0.5">
                  <TrendingUp className="h-3 w-3" />
                  Profit
                </div>
              </div>
              <div className="h-8 w-px bg-base-300" />
              <div className="text-center">
                <div className="mono-num text-lg font-bold">
                  {resolvedBets.length > 0 ? `${lbEntry.winRate}%` : "—"}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                  <Target className="h-3 w-3" />
                  Accuracy
                </div>
              </div>
              <div className="h-8 w-px bg-base-300" />
              <div className="text-center">
                <div className="mono-num text-lg font-bold">{lbEntry.totalPredictions}</div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                  <Layers className="h-3 w-3" />
                  Predictions
                </div>
              </div>
              <div className="h-8 w-px bg-base-300" />
              <div className="text-center">
                <div className="text-lg font-bold">
                  {new Date(user.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-base-content/40">
                  <Calendar className="h-3 w-3" />
                  Joined
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Founder startups */}
      {isFounder && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Layers className="h-5 w-5 text-primary" />
            Startups <span className="mono-num text-sm font-normal text-base-content/50">({founderStartups.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {founderStartups.map((s) => (
              <Link
                key={s.slug}
                href={`/startups/${s.slug}`}
                className="flex items-center justify-between rounded-xl border border-base-300 bg-base-100 p-4 transition-colors hover:bg-base-300/30"
              >
                <div className="flex items-center gap-3">
                  {s.icon ? (
                    <img src={s.icon} alt={s.name} className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="mono-num text-xs text-base-content/50">
                      {formatCents(s.revenue.mrr)} MRR · {formatCents(s.revenue.total)} total
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.onSale && (
                    <span className="badge badge-warning badge-xs badge-outline">FOR SALE</span>
                  )}
                  <span className={`mono-num text-xs font-medium ${(s.growth30d ?? 0) >= 0 ? "text-yes" : "text-no"}`}>
                    {s.growth30d !== null ? `${s.growth30d >= 0 ? "+" : ""}${s.growth30d.toFixed(1)}%` : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <Link
            href={`/markets/create?founder=${user.xHandle}`}
            className="btn btn-primary btn-sm gap-1.5 w-full"
          >
            {isOwnProfile ? "Bet on myself" : "Bet on this founder"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Active Bets */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <TrendingUp className="h-5 w-5 text-primary" />
          Active Bets <span className="mono-num text-sm font-normal text-base-content/50">({activeBets.length})</span>
        </h2>
        {activeBets.length > 0 ? (
          <div className="space-y-2">
            {activeBets.map((bet) => {
              const market = marketCache.get(bet.marketId);
              const startup = market ? startupCache.get(market.startupSlug) : null;
              if (!market || !startup) return null;

              const isFounderMarket = market.type === "founder" && market.founderXHandle;
              const winningSideBets = bet.side === "yes" ? market.totalYesCredits : market.totalNoCredits;
              const estPayout = winningSideBets > 0 ? Math.floor((bet.amount / winningSideBets) * market.totalCredits) : 0;
              const estProfit = estPayout - bet.amount;

              return (
                <Link key={bet.id} href={`/markets/${market.id}`}
                  className="block rounded-xl border border-base-300 bg-base-100 p-4 transition-colors hover:bg-base-300/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {isFounderMarket ? (
                        <FounderAvatar xHandle={market.founderXHandle!} name={market.founderXHandle!} size={32} className="shrink-0 mt-0.5" />
                      ) : startup.icon ? (
                        <img src={startup.icon} alt={startup.name} className="h-8 w-8 shrink-0 rounded-lg object-cover mt-0.5" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
                          {startup.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-tight">{market.question}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-base-content/50">
                          {isFounderMarket ? (
                            <>
                              <XIcon size={11} />
                              <span>@{market.founderXHandle}</span>
                            </>
                          ) : (
                            <span>{startup.name}</span>
                          )}
                          <span>— <span className="mono-num">{daysUntil(market.closesAt)}d</span> left</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex items-center gap-1.5">
                        <span className={`mono-num rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          bet.side === "yes" ? "bg-success/10 text-yes" : "bg-error/10 text-no"
                        }`}>{bet.side.toUpperCase()}</span>
                        <Credits amount={bet.amount} className="text-sm font-semibold" />
                      </div>
                    </div>
                  </div>

                  <OddsBar yesOdds={market.yesOdds} size="sm" className="mt-2.5" />

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-base-content/50">
                    <div className="flex items-center gap-3">
                      <span>Est. payout: <Credits amount={estPayout} className={`font-semibold ${estProfit >= 0 ? "text-yes" : "text-no"}`} /></span>
                      <span className={`mono-num font-semibold ${estProfit >= 0 ? "text-yes" : "text-no"}`}>
                        {estProfit >= 0 ? "+" : ""}{estProfit.toLocaleString()} profit
                      </span>
                    </div>
                    <span><Credits amount={market.totalCredits} /> pool</span>
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
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <History className="h-5 w-5 text-base-content/40" />
          Bet History <span className="mono-num text-sm font-normal text-base-content/50">({resolvedBets.length})</span>
        </h2>
        {resolvedBets.length > 0 ? (
          <div className="space-y-2">
            {resolvedBets.map((bet) => {
              const market = marketCache.get(bet.marketId);
              const startup = market ? startupCache.get(market.startupSlug) : null;
              if (!market || !startup) return null;
              const won = market.resolvedOutcome === bet.side;
              const isFounderMarket = market.type === "founder" && market.founderXHandle;
              return (
                <Link
                  key={bet.id}
                  href={`/markets/${market.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-base-300 bg-base-100 p-4 transition-colors hover:bg-base-300/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isFounderMarket ? (
                      <FounderAvatar xHandle={market.founderXHandle!} name={market.founderXHandle!} size={32} className="shrink-0" />
                    ) : startup.icon ? (
                      <img src={startup.icon} alt={startup.name} className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                        {startup.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          won ? "bg-success/10 text-yes" : "bg-error/10 text-no"
                        }`}>
                          {won && <Trophy className="h-3 w-3" />}
                          {won ? "WON" : "LOST"}
                        </span>
                        <span className="text-[13px] font-semibold truncate">{market.question}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-base-content/50 mt-0.5">
                        {isFounderMarket ? (
                          <>
                            <XIcon size={11} />
                            <span>@{market.founderXHandle}</span>
                          </>
                        ) : (
                          <span>{startup.name}</span>
                        )}
                        <span>— {bet.side.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  <Credits amount={bet.amount} className="shrink-0 text-sm font-semibold" />
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
