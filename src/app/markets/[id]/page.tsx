import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { OddsBar } from "@/components/market/odds-bar";
import { BetForm } from "@/components/market/bet-form";

import { FounderAvatar } from "@/components/founder/founder-avatar";
import {
  getMarketById,
  getStartupBySlug,
  getStartupsByFounder,
  getBetsForMarket,
  getUserById,
  getCurrentUser,
  formatCents,
  daysUntil,
  timeAgo,
} from "@/lib/data";
import { Credits } from "@/components/ui/credits";

const MARKET_MAKER_ID = "c0000000-0000-0000-0000-000000000001";
import { ShareMarketButton } from "@/components/market/share-market-button";
import { XIcon } from "@/components/ui/x-icon";
import { Clock, Users, ExternalLink, MessageCircle, Activity } from "lucide-react";
import { METRICS, type MetricId } from "@/lib/market-templates";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const market = await getMarketById(id);
  if (!market) return {};

  const isFounderMarket = market.type === "founder" && market.founderXHandle;

  if (isFounderMarket) {
    return {
      title: `${market.question} — @${market.founderXHandle}`,
      description: `${Math.round(market.yesOdds * 100)}% chance YES. ${market.totalBettors} bettors, ${market.totalCredits.toLocaleString()} bananas in the pool.`,
      openGraph: {
        title: market.question,
        description: `@${market.founderXHandle} — ${Math.round(market.yesOdds * 100)}% YES. Bet now on PolyMRR.`,
      },
    };
  }

  const startup = await getStartupBySlug(market.startupSlug);
  return {
    title: `${market.question} — ${startup?.name ?? "Market"}`,
    description: `${Math.round(market.yesOdds * 100)}% chance YES. ${market.totalBettors} bettors, ${market.totalCredits.toLocaleString()} bananas in the pool.`,
    openGraph: {
      title: market.question,
      description: `${startup?.name ?? "Startup"} — ${Math.round(market.yesOdds * 100)}% YES. Bet now on PolyMRR.`,
    },
  };
}

const typeLabels: Record<string, string> = {
  "mrr-target": "MRR Target",
  acquisition: "Acquisition",
  founder: "Founder",
};

export default async function MarketPage({ params }: PageProps) {
  const { id } = await params;
  const market = await getMarketById(id);
  if (!market) notFound();

  const isFounderMarket = market.type === "founder" && market.founderXHandle;

  const startup = await getStartupBySlug(market.startupSlug);
  if (!startup) notFound();

  const founderStartups = isFounderMarket
    ? await getStartupsByFounder(market.founderXHandle!)
    : [];

  const [recentBets, user] = await Promise.all([
    getBetsForMarket(market.id),
    getCurrentUser(),
  ]);

  const betUsers = new Map<string, Awaited<ReturnType<typeof getUserById>>>();
  for (const bet of recentBets) {
    if (!betUsers.has(bet.userId)) {
      betUsers.set(bet.userId, await getUserById(bet.userId));
    }
  }

  const days = daysUntil(market.closesAt);

  // Founder aggregate stats
  const founderTotalMrr = founderStartups.reduce((sum, s) => sum + s.revenue.mrr, 0);
  const founderTotalRevenue = founderStartups.reduce((sum, s) => sum + s.revenue.total, 0);
  const founderAvgGrowth = founderStartups.length > 0
    ? founderStartups.reduce((sum, s) => sum + (s.growth30d ?? 0), 0) / founderStartups.length
    : 0;

  // Current value for the tracked metric
  const rc = market.resolutionConfig;
  const metricDef = rc?.metric ? METRICS[rc.metric as MetricId] : null;
  let currentValueLabel: string | null = null;
  let currentValueFormatted: string | null = null;
  if (rc && metricDef) {
    currentValueLabel = `Current ${metricDef.label}`;
    const m = rc.metric;
    if (m === "mrr") {
      currentValueFormatted = formatCents(startup.revenue.mrr);
    } else if (m === "revenue_30d") {
      currentValueFormatted = formatCents(startup.revenue.last30Days);
    } else if (m === "revenue_total") {
      currentValueFormatted = formatCents(startup.revenue.total);
    } else if (m === "on_sale") {
      currentValueFormatted = startup.onSale ? "Yes" : "No";
    } else if (m === "founder_revenue") {
      currentValueFormatted = formatCents(founderTotalRevenue);
    } else if (m === "founder_startups") {
      currentValueFormatted = String(founderStartups.length);
    } else if (m === "founder_followers") {
      const max = Math.max(0, ...founderStartups.map((s) => s.xFollowerCount ?? 0));
      currentValueFormatted = max.toLocaleString();
    } else if (m === "founder_top_startup") {
      const sorted = [...founderStartups].sort((a, b) => b.revenue.total - a.revenue.total);
      currentValueLabel = "Current #1";
      currentValueFormatted = sorted[0]?.name ?? "-";
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Market Header */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-5 p-6">
          <div className="flex flex-wrap items-center gap-3">
            {isFounderMarket ? (
              <a
                href={`https://x.com/${market.founderXHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 transition-colors hover:text-primary"
              >
                <FounderAvatar
                  xHandle={market.founderXHandle!}
                  name={market.founderXHandle!}
                  size={40}
                />
                <span className="font-semibold">@{market.founderXHandle}</span>
                <XIcon size={14} className="text-base-content/50" />
              </a>
            ) : (
              <Link href={`/startups/${startup.slug}`} className="flex items-center gap-2.5 transition-colors hover:text-primary">
                {startup.icon ? (
                  <img src={startup.icon} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {startup.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="font-semibold">{startup.name}</span>
                <ExternalLink className="h-3.5 w-3.5 text-base-content/50" />
              </Link>
            )}
            <span className="badge badge-neutral badge-sm">{typeLabels[market.type]}</span>
            {market.status === "resolved" && (
              <span className={`badge badge-sm ${
                market.resolvedOutcome === "yes" ? "badge-success badge-outline" : "badge-error badge-outline"
              }`}>
                Resolved {market.resolvedOutcome?.toUpperCase()}
              </span>
            )}
            {!isFounderMarket && startup.xHandle && (
              <a
                href={`https://x.com/${startup.xHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 ml-auto"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reach out to Founder</span>
                <span className="sm:hidden">Contact</span>
              </a>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold leading-tight">{market.question}</h1>
            {currentValueLabel && currentValueFormatted && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-base-content/50">
                <Activity className="h-3 w-3" />
                <span>{currentValueLabel}:</span>
                <span className="mono-num font-semibold text-base-content/70">{currentValueFormatted}</span>
              </div>
            )}
          </div>

          <OddsBar yesOdds={market.yesOdds} size="lg" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-sm text-base-content/50">
              <span className="inline-flex items-center gap-1"><Credits amount={market.totalCredits} /> pool</span>
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span className="mono-num">{market.totalBettors}</span> bettors
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {market.status === "open" ? (
                  <span>Closes in <span className="mono-num font-semibold text-base-content">{days}</span> days</span>
                ) : (
                  <span>Closed {timeAgo(market.closesAt)}</span>
                )}
              </span>
            </div>
            <ShareMarketButton
              question={market.question}
              startupName={isFounderMarket ? `@${market.founderXHandle}` : startup.name}
              startupIcon={isFounderMarket ? `https://unavatar.io/x/${market.founderXHandle}` : startup.icon}
              yesOdds={market.yesOdds}
              marketId={market.id}
              rounded={isFounderMarket ? "full" : "md"}
            />
          </div>

          {market.status === "open" && (
            <BetForm
              marketId={market.id}
              yesOdds={market.yesOdds}
              yesShares={market.yesShares}
              noShares={market.noShares}
              liquidityParam={market.liquidityParam}
              totalCredits={market.totalCredits}
              totalYesCredits={market.totalYesCredits}
              totalNoCredits={market.totalNoCredits}
              user={user}
            />
          )}
        </div>
      </div>

      {isFounderMarket ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body p-5">
                  <div className="mono-num text-2xl font-bold">{formatCents(founderTotalRevenue)}</div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-base-content/50">Total Revenue</div>
                </div>
              </div>
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body p-5">
                  <div className="mono-num text-2xl font-bold">{founderStartups.length}</div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-base-content/50">Startups</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body p-5">
                  <div className="mono-num text-2xl font-bold text-primary">{formatCents(founderTotalMrr)}</div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-base-content/50">Combined MRR</div>
                </div>
              </div>
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body p-5">
                  <div className={`mono-num text-2xl font-bold ${founderAvgGrowth >= 0 ? "text-yes" : "text-no"}`}>
                    {founderAvgGrowth >= 0 ? "+" : ""}{founderAvgGrowth.toFixed(1)}%
                  </div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-base-content/50">Avg Growth</div>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 border border-base-300">
              <div className="card-body p-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-base-content/50">Startups</h3>
                <div className="space-y-2">
                  {founderStartups
                    .sort((a, b) => b.revenue.total - a.revenue.total)
                    .map((s) => (
                      <Link
                        key={s.slug}
                        href={`/startups/${s.slug}`}
                        className="flex items-center gap-3 rounded-lg bg-base-200/50 px-3 py-2.5 transition-colors hover:bg-base-200"
                      >
                        {s.icon ? (
                          <img src={s.icon} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                            {s.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold truncate">{s.name}</div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <div className="mono-num text-[13px] font-semibold">{formatCents(s.revenue.mrr)}</div>
                            <div className="mono-num text-[10px] text-base-content/40">MRR</div>
                          </div>
                          <div className="text-right">
                            <div className="mono-num text-[13px] text-base-content/50">{formatCents(s.revenue.total)}</div>
                            <div className="mono-num text-[10px] text-base-content/40">Total</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body p-5">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-base-content/50">Recent Bets</h3>
                {recentBets.length > 0 ? (
                  <div className="space-y-3">
                    {recentBets.map((bet) => {
                      const betUser = betUsers.get(bet.userId);
                      return (
                        <div key={bet.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {bet.userId === MARKET_MAKER_ID && (
                              <Image src="/icon.png" alt="" width={16} height={16} className="rounded-sm" />
                            )}
                            <Link
                              href={`/profile/${bet.userId}`}
                              className="text-[13px] font-semibold text-primary hover:underline"
                            >
                              {betUser?.xHandle ? `@${betUser.xHandle}` : betUser?.xName ?? "Anon"}
                            </Link>
                            <Credits amount={bet.amount} size="xs" className="text-base-content/50" />
                            <span className={`badge badge-xs ${
                              bet.side === "yes" ? "badge-success badge-outline" : "badge-error badge-outline"
                            }`}>
                              {bet.side.toUpperCase()}
                            </span>
                          </div>
                          <span className="mono-num text-xs text-base-content/50">{timeAgo(bet.createdAt)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-base-content/50">No bets yet. Be the first!</p>
                )}
              </div>
            </div>

            <div className="card bg-base-100 border border-base-300">
              <div className="card-body p-5">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-base-content/50">Resolution Criteria</h3>
                <p className="text-[13px] leading-relaxed text-base-content/50">{market.resolutionCriteria}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <a
            href={`https://trustmrr.com/startup/${startup.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-[13px] font-medium text-primary/80 transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/50"
          >
            <Image src="/trustmrr.webp" alt="TrustMRR" width={18} height={18} className="rounded-sm" />
            View on TrustMRR
          </a>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Left: 4 stat cards in a 2x2 grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body p-5">
                  <div className="mono-num text-2xl font-bold">
                    {startup.revenue.mrr > 0 ? formatCents(startup.revenue.mrr) : "-"}
                  </div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-base-content/50">Current MRR</div>
                </div>
              </div>
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body p-5">
                  <div className={`mono-num text-2xl font-bold ${startup.growth30d !== null && startup.growth30d !== 0 ? (startup.growth30d >= 0 ? "text-yes" : "text-no") : ""}`}>
                    {startup.growth30d !== null && startup.growth30d !== 0
                      ? `${startup.growth30d >= 0 ? "+" : ""}${startup.growth30d.toFixed(1)}%`
                      : "-"}
                  </div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-base-content/50">30d Growth</div>
                </div>
              </div>
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body p-5">
                  <div className="mono-num text-2xl font-bold">
                    {startup.revenue.total > 0 ? formatCents(startup.revenue.total) : "-"}
                  </div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-base-content/50">Total Revenue</div>
                </div>
              </div>
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body p-5">
                  <div className="text-2xl font-bold">
                    {startup.foundedDate
                      ? new Date(startup.foundedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                      : "-"}
                  </div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-base-content/50">Founded</div>
                </div>
              </div>
            </div>

            {/* Right: Recent Bets + Resolution Criteria */}
            <div className="space-y-4">
              <div className="card bg-base-100 border border-base-300">
                <div className="card-body p-5">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-base-content/50">Recent Bets</h3>
                  {recentBets.length > 0 ? (
                    <div className="max-h-48 space-y-3 overflow-y-auto">
                      {recentBets.map((bet) => {
                        const betUser = betUsers.get(bet.userId);
                        return (
                          <div key={bet.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {bet.userId === MARKET_MAKER_ID && (
                                <Image src="/icon.png" alt="" width={16} height={16} className="rounded-sm" />
                              )}
                              <Link
                                href={`/profile/${bet.userId}`}
                                className="text-[13px] font-semibold text-primary hover:underline"
                              >
                                {betUser?.xHandle ? `@${betUser.xHandle}` : betUser?.xName ?? "Anon"}
                              </Link>
                              <Credits amount={bet.amount} size="xs" className="text-base-content/50" />
                              <span className={`badge badge-xs ${
                                bet.side === "yes" ? "badge-success badge-outline" : "badge-error badge-outline"
                              }`}>
                                {bet.side.toUpperCase()}
                              </span>
                            </div>
                            <span className="mono-num text-xs text-base-content/50">{timeAgo(bet.createdAt)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-base-content/50">No bets yet. Be the first!</p>
                  )}
                </div>
              </div>

              <div className="card bg-base-100 border border-base-300">
                <div className="card-body p-5">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-base-content/50">Resolution Criteria</h3>
                  <p className="text-[13px] leading-relaxed text-base-content/50">{market.resolutionCriteria}</p>
                </div>
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
