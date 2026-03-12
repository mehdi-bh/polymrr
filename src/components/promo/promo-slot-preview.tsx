"use client";

import { PROMO_FONTS } from "./constants";
import type { PromoFont } from "@/lib/types";

interface PromoSlotPreviewProps {
  startupName: string;
  startupIcon: string | null;
  tagline: string;
  font: PromoFont;
  color: string;
  href?: string;
  compact?: boolean;
}

export function PromoSlotPreview({
  startupName,
  startupIcon,
  tagline,
  font,
  color,
  href,
  compact,
}: PromoSlotPreviewProps) {
  const fontFamily = PROMO_FONTS.find((f) => f.id === font)?.family ?? "var(--font-inconsolata)";

  const content = (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-base-100 flex items-center gap-3 transition-all hover:brightness-110 ${
        compact ? "px-4 py-3" : "px-5 py-5"
      }`}
      style={{ borderColor: `${color}40`, fontFamily }}
    >
      {/* Color gradient fade */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-28"
        style={{
          background: `linear-gradient(to right, transparent, ${color}18)`,
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(to right, ${color}60, transparent)`,
        }}
      />

      {startupIcon ? (
        <img
          src={startupIcon}
          alt={startupName}
          className="h-8 w-8 shrink-0 rounded-lg"
        />
      ) : (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {startupName?.[0] ?? "?"}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold" style={{ color }}>
          {startupName}
        </p>
        {tagline && (
          <p className="truncate text-xs text-base-content/60">{tagline}</p>
        )}
      </div>

      <span
        className="text-[9px] font-semibold uppercase tracking-wider opacity-40"
        style={{ color }}
      >
        Ad
      </span>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer sponsored">
        {content}
      </a>
    );
  }

  return content;
}
