/**
 * Daily full sync cron — fetches ALL startups from TrustMRR.
 *
 * Schedule: 2:00 AM UTC daily (configured in vercel.json)
 * Strategy: paginate list endpoint, then fetch detail for each startup.
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

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const logId = await logSync(admin, "trustmrr_full_daily", "running");

  try {
    console.log("[sync-startups] Starting full sync...");
    const startupList = await fetchAllSlugs();
    console.log(`[sync-startups] Found ${startupList.length} startups to sync`);

    let synced = 0;
    const errors: string[] = [];

    for (const item of startupList) {
      try {
        const detail = await getStartupDetail(item.slug);
        await upsertStartup(admin, detail);
        await storeSnapshot(admin, detail);
        synced++;
        console.log(`[sync-startups] ${synced}/${startupList.length} ${item.slug} OK`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[sync-startups] ${item.slug} FAILED: ${msg}`);
        errors.push(`${item.slug}: ${msg}`);
      }
    }

    const summary = `Done: ${synced}/${startupList.length} synced, ${errors.length} errors`;
    console.log(`[sync-startups] ${summary}`);

    if (logId) {
      await updateSyncLog(admin, logId, "completed", {
        total: startupList.length,
        synced,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
        completed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true, synced, total: startupList.length });
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
