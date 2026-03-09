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
            <div className="min-w-0 flex-1 truncate text-xs text-base-content/50">
              <span className="font-semibold text-base-content/80">
                {item.userXHandle ? `@${item.userXHandle}` : item.userName || "Anonymous"}
              </span>
              {" "}bet{" "}
              <span className={`font-bold ${item.side === "yes" ? "text-success" : "text-error"}`}>
                {item.side.toUpperCase()}
              </span>
              {" "}on{" "}
              <span className="text-base-content/70">&quot;{item.marketQuestion}&quot;</span>
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
