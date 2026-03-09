"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Credits } from "@/components/ui/credits";
import type { FeedItem } from "@/lib/types";

interface LiveFeedProps {
  items: FeedItem[];
}

const NEW_ITEMS_COUNT = 5;

export function LiveFeed({ items }: LiveFeedProps) {
  // Split: first N items will animate in one by one, the rest are shown immediately
  const newItems = items.slice(0, NEW_ITEMS_COUNT);
  const existingItems = items.slice(NEW_ITEMS_COUNT);

  const [insertedIds, setInsertedIds] = useState<Set<string>>(new Set());
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const insertIndex = useRef(0);

  useEffect(() => {
    if (insertIndex.current >= newItems.length) return;

    const delay = insertIndex.current === 0
      ? 800
      : 1200 + Math.random() * 1800;

    const timeout = setTimeout(() => {
      const item = newItems[newItems.length - 1 - insertIndex.current];
      setAnimatingId(item.id);
      setInsertedIds((prev) => new Set(prev).add(item.id));
      insertIndex.current += 1;

      // Clear animating state after animation completes
      setTimeout(() => setAnimatingId(null), 400);
    }, delay);

    return () => clearTimeout(timeout);
  }, [insertedIds.size, newItems]);

  // Build visible list: inserted new items (in order) + existing items
  const insertedNewItems = newItems.filter((item) => insertedIds.has(item.id));
  const visibleItems = [...insertedNewItems, ...existingItems];

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
        <div>
          {visibleItems.map((item) => {
            const isAnimating = item.id === animatingId;
            return (
              <div
                key={item.id}
                className={`overflow-hidden transition-all duration-400 ease-out ${
                  isAnimating ? "animate-[feed-slide-in_0.4s_ease-out]" : ""
                }`}
              >
                <Link
                  href={`/markets/${item.marketId}`}
                  className="flex items-center gap-3 border-b border-base-300/50 px-4 py-3 transition-colors hover:bg-base-300/30 sm:px-5"
                >
                  <div className="min-w-0 flex-1 truncate text-xs text-base-content/50">
                    <span className="font-semibold text-primary">
                      {item.userXHandle ? `@${item.userXHandle}` : item.userName || "Anonymous"}
                    </span>
                    {" "}bet{" "}
                    <span className={`font-bold ${item.side === "yes" ? "text-success" : "text-error"}`}>
                      {item.side.toUpperCase()}
                    </span>
                    {" "}on{" "}
                    <span className="text-base-content/70">&quot;{item.marketQuestion}&quot;</span>
                  </div>
                  <Credits amount={item.amount} size="xs" className="shrink-0 font-medium text-base-content/60" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
