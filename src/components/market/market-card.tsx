"use client";

import Link from "next/link";
import { OddsBar } from "./odds-bar";
import { daysUntil, formatCents } from "@/lib/helpers";
import { Credits } from "@/components/ui/credits";
import { ShareMarketButton } from "./share-market-button";
import { FounderAvatar } from "@/components/founder/founder-avatar";
import { XIcon } from "@/components/ui/x-icon";
import type { Market, Startup } from "@/lib/types";
import { Clock, Users } from "lucide-react";

interface MarketCardProps {
  market: Market;
  startup: Startup;
}

export function MarketCard({ market, startup }: MarketCardProps) {
  const days = daysUntil(market.closesAt);
  const closingSoon = days <= 10;
  const isFounderMarket = market.type === "founder" && market.founderXHandle;

  return (
    <Link
      href={`/markets/${market.id}`}
      className="card-hover card bg-base-100 border border-base-300"
    >
      <div className="card-body gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {isFounderMarket ? (
              <>
                <FounderAvatar
                  xHandle={market.founderXHandle!}
                  name={market.founderXHandle!}
                  size={36}
                />
                <span className="text-sm font-semibold truncate">@{market.founderXHandle}</span>
                <XIcon size={12} className="shrink-0 text-base-content/50" />
              </>
            ) : (
              <>
                {startup.icon ? (
                  <img src={startup.icon} alt={startup.name} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {startup.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-sm font-semibold">{startup.name}</span>
                  <span className="mono-num ml-2 text-xs text-base-content/50">
                    {formatCents(startup.revenue.mrr)}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="flex shrink-0 gap-1.5">
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
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="mono-num">{days}d</span>
            </span>
            <ShareMarketButton
              question={market.question}
              startupName={startup.name}
              startupIcon={startup.icon}
              yesOdds={market.yesOdds}
              marketId={market.id}
              size="sm"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
