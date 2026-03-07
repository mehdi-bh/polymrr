/**
 * Daily full sync cron — fetches ALL startups from TrustMRR.
 *
 * Schedule: 2:00 AM UTC daily (configured in vercel.json)
 * Strategy: paginate list endpoint, then fetch detail for each startup.
 *           Processes in batches; self-re-invokes if there's remaining work.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchAllSlugs,
  getStartupDetail,
  upsertStartup,
  storeSnapshot,
  logSync,
  updateSyncLog,
} from "@/lib/trustmrr";
import { NextResponse } from "next/server";

export const maxDuration = 300;

const BATCH_SIZE = 80;
const SAFE_TIME_MS = 270_000; // stop 30s before maxDuration to leave room for cleanup

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const logId = await logSync(admin, "trustmrr_full_daily", "running");
  const startedAt = Date.now();

  try {
    console.log("[sync-startups] Starting full sync...");
    const startupList = await fetchAllSlugs();
    console.log(`[sync-startups] Found ${startupList.length} startups to sync`);

    // Only sync startups not already synced in the last hour (skip already-done batches)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentlySynced } = await admin
      .from("startups")
      .select("slug")
      .gte("synced_at", oneHourAgo);

    const recentSet = new Set((recentlySynced ?? []).map((s) => s.slug));
    const remaining = startupList.filter((item) => !recentSet.has(item.slug));
    const batch = remaining.slice(0, BATCH_SIZE);

    console.log(`[sync-startups] ${remaining.length} remaining, processing ${batch.length}`);

    let synced = 0;
    const errors: string[] = [];

    for (const item of batch) {
      // Stop early if approaching timeout
      if (Date.now() - startedAt > SAFE_TIME_MS) {
        console.log("[sync-startups] Approaching timeout, stopping early");
        break;
      }

      try {
        const detail = await getStartupDetail(item.slug);
        await upsertStartup(admin, detail);
        await storeSnapshot(admin, detail);
        synced++;
        console.log(`[sync-startups] ${synced}/${batch.length} ${item.slug} OK`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[sync-startups] ${item.slug} FAILED: ${msg}`);
        errors.push(`${item.slug}: ${msg}`);
      }
    }

    const pending = remaining.length - synced;
    console.log(`[sync-startups] Batch done: ${synced} synced, ${pending} pending`);

    if (logId) {
      await updateSyncLog(admin, logId, pending > 0 ? "partial" : "completed", {
        total: startupList.length,
        synced,
        pending,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
        completed_at: new Date().toISOString(),
      });
    }

    // Self-re-invoke if there's remaining work
    if (pending > 0) {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
      fetch(`${baseUrl}/api/cron/sync-startups`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }).catch(() => {}); // fire-and-forget
    }

    return NextResponse.json({ ok: true, synced, pending, total: startupList.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sync-startups] Fatal: ${msg}`);

    if (logId) {
      await updateSyncLog(admin, logId, "failed", {
        error: msg,
        completed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
