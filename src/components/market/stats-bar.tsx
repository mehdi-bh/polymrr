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
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-primary/30 bg-base-100 px-5 py-4 text-center">
          <div className="mono-num text-2xl font-bold">{item.value}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-base-content/50">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
