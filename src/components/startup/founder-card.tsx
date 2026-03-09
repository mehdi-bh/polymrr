import Link from "next/link";
import { formatCents } from "@/lib/helpers";
import type { Startup, Market } from "@/lib/types";
import { XIcon } from "@/components/ui/x-icon";
import { FounderAvatar } from "@/components/founder/founder-avatar";
import { ArrowRight } from "lucide-react";

interface FounderCardProps {
  xHandle: string;
  xFollowerCount: number | null;
  allStartups: Startup[];
  allMarkets: Market[];
}

export function FounderCard({ xHandle, xFollowerCount, allStartups, allMarkets }: FounderCardProps) {
  const totalMrr = allStartups.reduce((sum, s) => sum + s.revenue.mrr, 0);
  const totalMarkets = allMarkets.filter((m) => m.status === "open").length;
  const avgGrowth = allStartups.length > 0
    ? allStartups.reduce((sum, s) => sum + (s.growth30d ?? 0), 0) / allStartups.length
    : 0;
  const totalRevenue = allStartups.reduce((sum, s) => sum + s.revenue.total, 0);

  const topStartups = [...allStartups]
    .sort((a, b) => b.revenue.total - a.revenue.total)
    .slice(0, 3);

  return (
    <div className="card border border-primary/20 bg-base-100 overflow-hidden">
      <div className="flex items-center justify-end px-5 pt-4">
        <a
          href={`https://x.com/${xHandle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-xs btn-square opacity-50 hover:opacity-100"
        >
          <XIcon size={14} />
        </a>
      </div>

      <div className="card-body items-center gap-4 px-5 pb-5 pt-3">
        <FounderAvatar
          xHandle={xHandle}
          name={xHandle}
          size={80}
        />

        <div className="text-center">
          <div className="text-sm font-bold uppercase tracking-wide">@{xHandle}</div>
          <div className="mono-num text-xs text-base-content/50">
            {allStartups.length} startup{allStartups.length !== 1 ? "s" : ""} tracked
          </div>
        </div>

        <div className="h-px w-full bg-base-300" />

        <div className="w-full space-y-2.5 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Combined MRR</span>
            <span className="mono-num font-bold text-primary">{formatCents(totalMrr)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Growth</span>
            <span className={`mono-num font-bold ${avgGrowth >= 0 ? "text-yes" : "text-no"}`}>
              {avgGrowth >= 0 ? "+" : ""}{avgGrowth.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Total Revenue</span>
            <span className="mono-num font-semibold">{formatCents(totalRevenue)}</span>
          </div>
          {xFollowerCount && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">X Followers</span>
              <span className="mono-num font-semibold">{xFollowerCount.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="h-px w-full bg-base-300" />

        <div className="w-full space-y-1.5">
          {topStartups.map((s, i) => (
            <Link key={s.slug} href={`/startups/${s.slug}`} className="flex items-center gap-2.5 rounded-lg bg-base-200/50 px-3 py-2 transition-colors hover:bg-base-200">
              <span className={`mono-num text-[10px] font-bold shrink-0 w-3 text-center ${
                i === 0 ? "text-warning" : i === 1 ? "text-base-content/40" : "text-base-content/25"
              }`}>
                {i + 1}
              </span>
              {s.icon ? (
                <img src={s.icon} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
              ) : (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold truncate">{s.name}</div>
              </div>
              <span className="mono-num text-[11px] text-base-content/50 shrink-0">
                {formatCents(s.revenue.total)}
              </span>
            </Link>
          ))}
        </div>

        <div className="h-px w-full bg-base-300" />

        <Link
          href={`/markets/create?founder=${xHandle}`}
          className="btn btn-primary btn-sm w-full gap-1.5"
        >
          Bet on this founder ({totalMarkets})
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
