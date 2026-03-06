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
import { Clock, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const user = getCurrentUser();
  if (!user) redirect("/");

  const userBets = getBetsForUser(user.id);
  const activeBets = userBets.filter((b) => getMarketById(b.marketId)?.status === "open");

  const closingSoon = getOpenMarkets()
    .filter((m) => daysUntil(m.closesAt) <= 7)
    .sort((a, b) => new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime());

  const userMarketIds = new Set(userBets.map((b) => b.marketId));
  const recommended = getOpenMarkets()
    .filter((m) => !userMarketIds.has(m.id))
    .sort((a, b) => b.totalBettors - a.totalBettors)
    .slice(0, 4);

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
              const market = getMarketById(bet.marketId);
              const startup = market ? getStartupBySlug(market.startupSlug) : null;
              if (!market || !startup) return null;

              const oddsNow = bet.side === "yes" ? market.yesOdds : 100 - market.yesOdds;
              const oddsDiff = oddsNow - bet.oddsAtTime;

              return (
                <Link key={bet.id} href={`/markets/${market.id}`}
                  className="flex items-center justify-between rounded-xl border border-base-300 bg-base-100 p-4 transition-colors hover:bg-base-300/30">
                  <div className="flex items-center gap-3">
                    <span className={`mono-num rounded-lg px-2 py-1 text-[10px] font-bold ${
                      bet.side === "yes" ? "bg-success/10 text-yes" : "bg-error/10 text-no"
                    }`}>{bet.side.toUpperCase()}</span>
                    <div>
                      <div className="text-[13px] font-semibold">{market.question}</div>
                      <div className="text-xs text-base-content/50">
                        {startup.name} — <span className="mono-num">{daysUntil(market.closesAt)}d</span> left
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Credits amount={bet.amount} className="text-sm font-semibold" />
                    <div className={`mono-num text-xs font-medium ${oddsDiff >= 0 ? "text-yes" : "text-no"}`}>
                      {oddsDiff >= 0 ? "+" : ""}{oddsDiff}%
                    </div>
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
            {closingSoon.map((m) => <MarketCard key={m.id} market={m} />)}
          </div>
        </div>
      )}

      {recommended.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold">Recommended</h2>
          <div className="stagger-children grid gap-4 sm:grid-cols-2">
            {recommended.map((m) => <MarketCard key={m.id} market={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}
