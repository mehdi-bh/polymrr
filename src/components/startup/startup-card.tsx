import Link from "next/link";
import { formatCents } from "@/lib/helpers";
import type { Startup } from "@/lib/types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StartupCardProps {
  startup: Startup;
  activeMarketCount: number;
  sentiment: number;
}

export function StartupCard({ startup, activeMarketCount, sentiment }: StartupCardProps) {
  const growthPositive = (startup.growth30d ?? 0) >= 0;

  return (
    <Link
      href={`/startups/${startup.slug}`}
      className="card-hover card bg-base-100 border border-base-300"
    >
      <div className="card-body gap-3 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {startup.icon ? (
              <img src={startup.icon} alt={startup.name} className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                {startup.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold">{startup.name}</span>
          </div>
          {startup.onSale && (
            <span className="badge badge-warning badge-sm badge-outline">
              {startup.askingPrice ? formatCents(startup.askingPrice) : "FOR SALE"}
            </span>
          )}
        </div>

        <p className="line-clamp-2 text-xs leading-relaxed text-base-content/50">
          {startup.description}
        </p>

        <div className="flex items-end gap-4">
          <div>
            <div className="mono-num text-xl font-bold">{formatCents(startup.revenue.mrr)}</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-base-content/50">MRR</div>
          </div>
          <div className="flex items-center gap-1 pb-0.5">
            {growthPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-yes" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-no" />
            )}
            <span className={`mono-num text-sm font-bold ${growthPositive ? "text-yes" : "text-no"}`}>
              {startup.growth30d !== null ? `${startup.growth30d.toFixed(1)}%` : "N/A"}
            </span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between text-xs text-base-content/50">
          <span>{activeMarketCount} active market{activeMarketCount !== 1 ? "s" : ""}</span>
          <span className={`mono-num font-semibold ${sentiment >= 50 ? "text-yes" : "text-no"}`}>
            {sentiment}% bullish
          </span>
        </div>
      </div>
    </Link>
  );
}
