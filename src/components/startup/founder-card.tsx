import { formatCents } from "@/lib/helpers";
import type { Cofounder, Startup, Market } from "@/lib/types";
import { XIcon } from "@/components/ui/x-icon";

interface FounderCardProps {
  founder: Cofounder;
  xFollowerCount: number | null;
  allStartups: Startup[];
  allMarkets: Market[];
}

function getFounderTier(totalMrr: number): { label: string; color: string; border: string; glow: string } {
  if (totalMrr >= 2000000) return { label: "LEGENDARY", color: "text-warning", border: "border-warning/40", glow: "shadow-[0_0_20px_rgba(245,166,35,0.15)]" };
  if (totalMrr >= 500000) return { label: "EPIC", color: "text-secondary", border: "border-secondary/40", glow: "shadow-[0_0_20px_rgba(52,211,153,0.1)]" };
  if (totalMrr >= 100000) return { label: "RARE", color: "text-info", border: "border-info/40", glow: "" };
  return { label: "RISING", color: "text-base-content/60", border: "border-base-300", glow: "" };
}

export function FounderCard({ founder, xFollowerCount, allStartups, allMarkets }: FounderCardProps) {
  const name = founder.xName ?? founder.xHandle;
  const totalMrr = allStartups.reduce((sum, s) => sum + s.revenue.mrr, 0);
  const totalMarkets = allMarkets.filter((m) => m.status === "open").length;
  const avgGrowth = allStartups.length > 0
    ? allStartups.reduce((sum, s) => sum + (s.growth30d ?? 0), 0) / allStartups.length
    : 0;
  const totalRevenue = allStartups.reduce((sum, s) => sum + s.revenue.total, 0);
  const tier = getFounderTier(totalMrr);

  return (
    <div className={`card border bg-base-100 ${tier.border} ${tier.glow} overflow-hidden`}>
      {/* Tier badge bar */}
      <div className="flex items-center justify-between px-5 pt-4">
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${tier.color}`}>
          {tier.label}
        </span>
        <a
          href={`https://x.com/${founder.xHandle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-xs btn-square opacity-50 hover:opacity-100"
        >
          <XIcon size={14} />
        </a>
      </div>

      <div className="card-body items-center gap-4 px-5 pb-5 pt-3">
        {/* Avatar */}
        <div className="relative">
          <div className={`flex h-20 w-20 items-center justify-center rounded-full border-2 ${tier.border} bg-base-200 text-2xl font-bold text-primary`}>
            {name.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Name + handle */}
        <div className="text-center">
          <div className="text-sm font-bold uppercase tracking-wide">@{founder.xHandle}</div>
          <div className="mono-num text-xs text-base-content/50">
            {allStartups.length} startup{allStartups.length !== 1 ? "s" : ""} tracked
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-base-300" />

        {/* Stats table */}
        <div className="w-full space-y-2.5 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Portfolio</span>
            <span className="mono-num font-semibold">{allStartups.length} startups</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Combined MRR</span>
            <span className="mono-num font-bold text-primary">{formatCents(totalMrr)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Growth</span>
            <span className={`mono-num font-bold ${avgGrowth >= 0 ? "text-yes" : "text-no"}`}>
              {avgGrowth >= 0 ? "+" : ""}{(avgGrowth * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Founder Value</span>
            <span className="mono-num font-semibold">{formatCents(totalRevenue)}</span>
          </div>
          {xFollowerCount && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">X Followers</span>
              <span className="mono-num font-semibold">{xFollowerCount.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-base-300" />

        {/* Bet on founder (coming soon) */}
        <div className="relative w-full">
          <button className="btn btn-sm w-full border-base-300 bg-base-200 text-base-content/30 cursor-not-allowed" disabled>
            Bet on this founder ({totalMarkets})
          </button>
          <span className="badge badge-neutral badge-xs absolute -top-2 right-2">Soon</span>
        </div>
      </div>
    </div>
  );
}
