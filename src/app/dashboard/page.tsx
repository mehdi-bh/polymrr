import { redirect } from "next/navigation";
import Link from "next/link";
import { MarketCard } from "@/components/market/market-card";
import {
  getCurrentUser,
  getBetsForUser,
  getMarketById,
  getStartupBySlug,
  getOpenMarkets,
  daysUntil,
} from "@/lib/data";
import Image from "next/image";
import { Credits } from "@/components/ui/credits";
import { OddsBar } from "@/components/market/odds-bar";
import { Clock, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const userBets = await getBetsForUser(user.id);

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

  const openMarkets = await getOpenMarkets();
  const closingSoon = openMarkets
    .filter((m) => daysUntil(m.closesAt) <= 7)
    .sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());

  const userMarketIds = new Set(userBets.map((b) => b.marketId));
  const recommended = openMarkets
    .filter((m) => !userMarketIds.has(m.id))
    .sort((a, b) => b.totalBettors - a.totalBettors)
    .slice(0, 4);

  for (const m of [...closingSoon, ...recommended]) {
    if (!startupCache.has(m.startupSlug)) {
      startupCache.set(m.startupSlug, await getStartupBySlug(m.startupSlug));
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Balance */}
      <div className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
          <Image src="/banana.svg" alt="credits" width={28} height={28} />
        </div>
        <div>
          <Credits amount={user.credits} size="lg" className="text-3xl font-bold" />
          <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">Available bananas</div>
        </div>
      </div>

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

              const winningSideBets = bet.side === "yes" ? market.totalYesCredits : market.totalNoCredits;
              const estPayout = winningSideBets > 0 ? Math.floor((bet.amount / winningSideBets) * market.totalCredits) : 0;
              const estProfit = estPayout - bet.amount;

              return (
                <Link key={bet.id} href={`/markets/${market.id}`}
                  className="block rounded-xl border border-base-300 bg-base-100 p-4 transition-colors hover:bg-base-300/30">
                  {/* Row 1: Question + bet amount */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold leading-tight">{market.question}</div>
                      <div className="mt-0.5 text-xs text-base-content/50">
                        {startup.name} — <span className="mono-num">{daysUntil(market.closesAt)}d</span> left
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

                  {/* Row 2: Odds bar */}
                  <OddsBar yesOdds={market.yesOdds} size="sm" className="mt-2.5" />

                  {/* Row 3: Stats */}
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
          <p className="text-sm text-base-content/50">No active bets. Browse markets to place one!</p>
        )}
      </div>

      {closingSoon.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Clock className="h-5 w-5 text-no" />
            Closing Soon <span className="mono-num text-sm font-normal text-base-content/50">({closingSoon.length})</span>
          </h2>
          <div className="stagger-children grid gap-4 sm:grid-cols-2">
            {closingSoon.map((m) => {
              const s = startupCache.get(m.startupSlug);
              return s ? <MarketCard key={m.id} market={m} startup={s} /> : null;
            })}
          </div>
        </div>
      )}

      {recommended.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Recommended</h2>
          <div className="stagger-children grid gap-4 sm:grid-cols-2">
            {recommended.map((m) => {
              const s = startupCache.get(m.startupSlug);
              return s ? <MarketCard key={m.id} market={m} startup={s} /> : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
