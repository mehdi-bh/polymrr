import { getGlobalStats, getPromoSlots, getCurrentUser } from "@/lib/data";
import { formatCents } from "@/lib/helpers";
import { PromoSlot } from "@/components/promo/promo-slot";

export async function StatsBar() {
  const [stats, slots, user] = await Promise.all([
    getGlobalStats(),
    getPromoSlots(),
    getCurrentUser(),
  ]);

  const slotMap = new Map(slots.map((s) => [s.slotIndex, s]));

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
        {([1, 2] as const).map((i) => (
          <PromoSlot
            key={i}
            slotIndex={i}
            slot={slotMap.get(i) ?? null}
            user={user}
          />
        ))}
      </div>
    </div>
  );
}
