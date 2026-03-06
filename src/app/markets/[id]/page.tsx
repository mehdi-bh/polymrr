import { notFound } from "next/navigation";
import Link from "next/link";
import { OddsBar } from "@/components/market/odds-bar";
import { BetForm } from "@/components/market/bet-form";
import { MrrChart } from "@/components/startup/mrr-chart";
import {
  getMarketById,
  getStartupBySlug,
  getBetsForMarket,
  getUserById,
  getMrrHistory,
  getCurrentUser,
  formatCents,
  daysUntil,
  timeAgo,
} from "@/lib/data";
import { Credits } from "@/components/ui/credits";
import { ShareMarketButton } from "@/components/market/share-market-button";
import { Clock, Users, ExternalLink } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

const typeLabels: Record<string, string> = {
  "mrr-target": "MRR Target",
  "growth-race": "Growth Race",
  acquisition: "Acquisition",
  survival: "Survival",
};

export default async function MarketPage({ params }: PageProps) {
  const { id } = await params;
  const market = await getMarketById(id);
  if (!market) notFound();

  const startup = await getStartupBySlug(market.startupSlug);
  if (!startup) notFound();

  const [recentBets, mrrData, user] = await Promise.all([
    getBetsForMarket(market.id),
    getMrrHistory(startup.slug),
    getCurrentUser(),
  ]);

  const betUsers = new Map<string, Awaited<ReturnType<typeof getUserById>>>();
  for (const bet of recentBets) {
    if (!betUsers.has(bet.userId)) {
      betUsers.set(bet.userId, await getUserById(bet.userId));
    }
  }

  const days = daysUntil(market.closesAt);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Market Header */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-5 p-6">
          <div className="flex items-center gap-3">
            <Link href={`/startups/${startup.slug}`} className="flex items-center gap-2.5 transition-colors hover:text-primary">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                {startup.name.slice(0, 2).toUpperCase()}
              </div>
              <span className="font-semibold">{startup.name}</span>
              <ExternalLink className="h-3.5 w-3.5 text-base-content/50" />
            </Link>
            <span className="badge badge-neutral badge-sm">{typeLabels[market.type]}</span>
            {market.status === "resolved" && (
              <span className={`badge badge-sm ${
                market.resolvedOutcome === "yes" ? "badge-success badge-outline" : "badge-error badge-outline"
              }`}>
                Resolved {market.resolvedOutcome?.toUpperCase()}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold leading-tight">{market.question}</h1>

          <OddsBar yesOdds={market.yesOdds} size="lg" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm text-base-content/50">
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
              startupName={startup.name}
              yesOdds={market.yesOdds}
              marketId={market.id}
            />
          </div>

          {market.status === "open" && (
            <BetForm marketId={market.id} yesOdds={market.yesOdds} user={user} />
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body p-5">
                <div className="mono-num text-2xl font-bold">{formatCents(startup.revenue.mrr)}</div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-base-content/50">Current MRR</div>
              </div>
            </div>
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body p-5">
                <div className={`mono-num text-2xl font-bold ${(startup.growth30d ?? 0) >= 0 ? "text-yes" : "text-no"}`}>
                  {startup.growth30d !== null
                    ? `${startup.growth30d >= 0 ? "+" : ""}${(startup.growth30d * 100).toFixed(0)}%`
                    : "N/A"}
                </div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-base-content/50">30d Growth</div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-base-content/50">MRR History</h3>
              <MrrChart slug={startup.slug} data={mrrData} height={180} />
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
    </div>
  );
}
