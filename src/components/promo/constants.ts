import type { PromoFont } from "@/lib/types";

// ---------------------------------------------------------------------------
// Promo Slot Pricing
// ---------------------------------------------------------------------------
export const PROMO_SLOT_NAME = "PolyMRR Promo Slot";
export const PROMO_DURATION_DAYS = 30;
export const PROMO_DURATION_LABEL = "1 month";

// Stripe (USD cents)
export const STRIPE_PRICE_CENTS = 4900;
export const STRIPE_PRICE_DISPLAY = "$49";

// Bananas
export const BANANA_COST = 100_000;

// ---------------------------------------------------------------------------
// Design Options
// ---------------------------------------------------------------------------
export const PROMO_FONTS: { id: PromoFont; label: string; family: string }[] = [
  { id: "inconsolata", label: "Inconsolata", family: "var(--font-inconsolata)" },
  { id: "inter", label: "Inter", family: "var(--font-inter)" },
  { id: "space-grotesk", label: "Space Grotesk", family: "var(--font-space-grotesk)" },
  { id: "dm-mono", label: "DM Mono", family: "var(--font-dm-mono)" },
];

export const PROMO_COLORS = [
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#10b981", label: "Emerald" },
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#8b5cf6", label: "Violet" },
  { hex: "#ef4444", label: "Red" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#06b6d4", label: "Cyan" },
  { hex: "#ec4899", label: "Pink" },
];

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------
export const STORAGE_KEY = "polymrr_promo_draft";
