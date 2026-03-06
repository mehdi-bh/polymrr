"use client";

import Link from "next/link";
import { getFeedItems, timeAgo } from "@/lib/data";
import { Credits } from "@/components/ui/credits";

export function LiveFeed() {
  const items = getFeedItems();

  return (
    <div className="card bg-base-100 border border-base-300 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-base-300 px-5 py-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-base-content/50">Live Feed</span>
      </div>

      <div className="divide-y divide-base-300/50">
        {items.map((item) => (
          <Link
            key={item.id}
            href="/markets"
            className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-base-300/30"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="shrink-0 text-[13px] font-semibold text-primary">
                @{item.userXHandle}
              </span>
              <span className={`mono-num badge badge-sm ${
                item.side === "yes" ? "badge-success badge-outline" : "badge-error badge-outline"
              }`}>
                {item.side.toUpperCase()}
              </span>
              <span className="truncate text-xs text-base-content/50">
                {item.startupName} &middot; &quot;{item.marketQuestion}&quot;
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-base-content/40">
              <Credits amount={item.amount} size="xs" className="font-medium text-base-content/60" />
              <span className="mono-num">{timeAgo(item.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
