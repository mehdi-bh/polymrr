/**
 * TrustMRR → Supabase sync logic.
 *
 * Upserts startup data and stores daily snapshots.
 * This module only handles data storage — the cron routes orchestrate fetching.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { TrustMRRDetail } from "./client";

type Admin = ReturnType<typeof createAdminClient>;

/** Round to integer, handling null */
function int(v: number | null | undefined): number | null {
  return v == null ? null : Math.round(v);
}

/** Normalize API category names to slug format matching our TrustMRRCategory type */
const CATEGORY_MAP: Record<string, string> = {
  "artificial intelligence": "ai",
  "developer tools": "developer-tools",
  "design tools": "design-tools",
  "e-commerce": "ecommerce",
  "crypto & web3": "crypto-web3",
  "health & fitness": "health-fitness",
  "social media": "social-media",
  "content creation": "content-creation",
  "customer support": "customer-support",
  "real estate": "real-estate",
  "iot & hardware": "iot-hardware",
  "green tech": "green-tech",
  "news & magazines": "news-magazines",
  "mobile apps": "mobile-apps",
};

function normalizeCategory(raw: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return CATEGORY_MAP[lower] ?? lower.replace(/\s+/g, "-");
}

/** Upsert a startup from TrustMRR detail response into our DB */
export async function upsertStartup(admin: Admin, data: TrustMRRDetail) {
  const { error } = await admin.from("startups").upsert(
    {
      slug: data.slug,
      name: data.name,
      icon: data.icon,
      description: data.description,
      website: data.website,
      country: data.country,
      founded_date: data.foundedDate,
      category: normalizeCategory(data.category),
      payment_provider: data.paymentProvider,
      target_audience: data.targetAudience,
      revenue_last_30_days: Math.round(data.revenue.last30Days),
      revenue_mrr: Math.round(data.revenue.mrr),
      revenue_total: Math.round(data.revenue.total),
      customers: Math.round(data.customers),
      active_subscriptions: Math.round(data.activeSubscriptions),
      asking_price: int(data.askingPrice),
      profit_margin_last_30_days: data.profitMarginLast30Days,
      growth_30d: data.growth30d,
      multiple: data.multiple,
      on_sale: data.onSale,
      first_listed_for_sale_at: data.firstListedForSaleAt,
      x_handle: data.xHandle,
      x_follower_count: int(data.xFollowerCount),
      is_merchant_of_record: data.isMerchantOfRecord ?? false,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );

  if (error) throw new Error(`Upsert startup ${data.slug}: ${error.message}`);

  // Replace tech stack
  if (data.techStack) {
    await admin.from("startup_tech_stack").delete().eq("startup_slug", data.slug);
    if (data.techStack.length > 0) {
      const { error: techErr } = await admin.from("startup_tech_stack").insert(
        data.techStack.map((t) => ({
          startup_slug: data.slug,
          slug: t.slug,
          category: t.category,
        }))
      );
      if (techErr) console.error(`Tech stack for ${data.slug}:`, techErr.message);
    }
  }

  // Replace cofounders — ensure the primary founder (xHandle) is always included
  await admin.from("startup_cofounders").delete().eq("startup_slug", data.slug);
  const cofounders = data.cofounders ?? [];
  const hasFounder = data.xHandle && cofounders.some((c) => c.xHandle === data.xHandle);
  const allCofounders = hasFounder || !data.xHandle
    ? cofounders
    : [{ xHandle: data.xHandle, xName: null }, ...cofounders];

  if (allCofounders.length > 0) {
    const { error: cofErr } = await admin.from("startup_cofounders").insert(
      allCofounders.map((c) => ({
        startup_slug: data.slug,
        x_handle: c.xHandle,
        x_name: c.xName,
      }))
    );
    if (cofErr) console.error(`Cofounders for ${data.slug}:`, cofErr.message);
  }
}

/** Store a daily snapshot (upserts on startup_slug + snapshot_date) */
export async function storeSnapshot(admin: Admin, data: TrustMRRDetail) {
  const today = new Date().toISOString().slice(0, 10);

  const { error } = await admin.from("startup_snapshots").upsert(
    {
      startup_slug: data.slug,
      snapshot_date: today,
      mrr: Math.round(data.revenue.mrr),
      revenue_last_30_days: Math.round(data.revenue.last30Days),
      revenue_total: Math.round(data.revenue.total),
      customers: Math.round(data.customers),
      active_subscriptions: Math.round(data.activeSubscriptions),
      growth_30d: data.growth30d,
      on_sale: data.onSale,
      asking_price: int(data.askingPrice),
    },
    { onConflict: "startup_slug,snapshot_date" }
  );

  if (error) console.error(`Snapshot for ${data.slug}:`, error.message);

  // Also update mrr_history for backward compatibility
  await admin.from("mrr_history").upsert(
    {
      startup_slug: data.slug,
      date: today,
      mrr: Math.round(data.revenue.mrr),
    },
    { onConflict: "startup_slug,date" }
  );
}

/** Log a sync run to sync_log */
export async function logSync(
  admin: Admin,
  source: string,
  status: "running" | "completed" | "failed",
  details?: Record<string, unknown>
): Promise<number | null> {
  const { data, error } = await admin
    .from("sync_log")
    .insert({ source, status, details: details ?? null })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to write sync_log:", error.message);
    return null;
  }
  return data.id;
}

/** Update an existing sync_log entry */
export async function updateSyncLog(
  admin: Admin,
  id: number,
  status: string,
  details: Record<string, unknown>
) {
  await admin
    .from("sync_log")
    .update({ status, details })
    .eq("id", id);
}
