import Link from "next/link";
import { OddsBar } from "./odds-bar";
import { getStartupBySlug, daysUntil, formatCents } from "@/lib/data";
import { Credits } from "@/components/ui/credits";
import type { Market } from "@/lib/types";
import { Clock, Users } from "lucide-react";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const startup = getStartupBySlug(market.startupSlug);
  if (!startup) return null;

  const days = daysUntil(market.closesAt);
  const closingSoon = days <= 10;

  return (
    <Link
      href={`/markets/${market.id}`}
      className="card-hover card bg-base-100 border border-base-300"
    >
      <div className="card-body gap-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              {startup.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="text-sm font-semibold">{startup.name}</span>
              <span className="mono-num ml-2 text-xs text-base-content/50">
                {formatCents(startup.revenue.mrr)}
              </span>
            </div>
          </div>
          <div className="flex gap-1.5">
            {startup.onSale && (
              <span className="badge badge-warning badge-sm badge-outline">FOR SALE</span>
            )}
            {closingSoon && (
              <span className="badge badge-error badge-sm badge-outline">CLOSING SOON</span>
            )}
          </div>
        </div>

        <p className="text-[13px] font-medium leading-snug">{market.question}</p>

        <OddsBar yesOdds={market.yesOdds} size="sm" />

        <div className="flex items-center justify-between text-xs text-base-content/50">
          <div className="flex items-center gap-3">
            <Credits amount={market.totalCredits} size="xs" />
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {market.totalBettors}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="mono-num">{days}d</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
