import Image from "next/image";
import { getGlobalStats, formatCents } from "@/lib/data";

export async function StatsBar() {
  const stats = await getGlobalStats();

  const items = [
    { label: "Open Markets", value: stats.openMarkets.toString() },
    { label: "Startups Tracked", value: stats.startupsTracked.toString() },
    { label: "Bets Placed", value: stats.betsPlaced.toLocaleString() },
    { label: "Verified Revenue", value: formatCents(stats.totalVerifiedRevenue) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-primary/30 bg-base-100 px-5 py-4 text-center">
            <div className="mono-num text-2xl font-bold">{item.value}</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-base-content/50">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Promo slots — desktop only */}
      <div className="hidden sm:grid grid-cols-2 gap-4">
        {[1, 2].map((slot) => (
          <div
            key={slot}
            className="group relative rounded-xl border border-dashed border-primary/20 bg-base-100/50 px-5 py-5 flex items-center justify-center gap-3 hover:border-primary/40 hover:bg-base-100 transition-all cursor-pointer"
          >
            <div className="text-center">
              <p className="text-xs font-semibold text-base-content/40 group-hover:text-base-content/60 transition-colors">
                Promote your startup here
              </p>
              <p className="text-[10px] font-bold text-primary/40 group-hover:text-primary/70 transition-colors tracking-wide">
                100,000 <span className="inline-block align-middle"><Image src="/banana.svg" alt="bananas" width={12} height={12} className="h-3 w-3 inline -mt-0.5" /></span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
