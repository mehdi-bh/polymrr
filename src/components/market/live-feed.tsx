"use client";

import Link from "next/link";
import { timeAgo } from "@/lib/helpers";
import { Credits } from "@/components/ui/credits";
import type { FeedItem } from "@/lib/types";

interface LiveFeedProps {
  items: FeedItem[];
}

export function LiveFeed({ items }: LiveFeedProps) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        Live Feed
      </h2>
      <div className="card bg-base-100 border border-base-300 overflow-hidden">
      <div className="divide-y divide-base-300/50">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/markets/${item.marketId}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-base-300/30 sm:px-5"
          >
            <span className={`mono-num badge badge-sm shrink-0 ${
              item.side === "yes" ? "badge-success badge-outline" : "badge-error badge-outline"
            }`}>
              {item.side.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 truncate text-xs text-base-content/50">
              <span className="hidden font-semibold text-primary sm:inline">@{item.userXHandle} </span>
              {item.startupName} &middot; &quot;{item.marketQuestion}&quot;
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-base-content/40">
              <Credits amount={item.amount} size="xs" className="font-medium text-base-content/60" />
              <span className="mono-num hidden sm:inline">{timeAgo(item.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>
      </div>
    </div>
  );
}
