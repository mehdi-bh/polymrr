/**
 * Full startup backfill — fetches detail for every startup.
 *
 * Manual only (via GitHub Actions workflow_dispatch).
 * No timeout — runs until complete.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  listStartups,
  getStartupDetail,
  upsertStartup,
  storeSnapshot,
  logSync,
  updateSyncLog,
  updateProgress,
  isCancelled,
} from "@/lib/trustmrr";

const PAGE_SIZE = 50;

async function main() {
  const admin = createAdminClient();

  // Check where the last run stopped so we can skip already-synced pages
  const { data: lastRun } = await admin
    .from("sync_log")
    .select("details")
    .eq("source", "trustmrr_full_daily")
    .in("status", ["running", "failed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prev = lastRun?.details as { synced?: number; page?: number } | null;
  const startPage = prev?.page ?? Math.floor((prev?.synced ?? 0) / PAGE_SIZE) + 1;
  const startSynced = prev?.synced ?? 0;

  if (startPage > 1) {
    console.log(`[sync-startups] Resuming from page ${startPage} (${startSynced} already synced)`);
  }

  const logId = await logSync(admin, "trustmrr_full_daily", "running");
  let synced = startSynced;
  let page = startPage;
  let lines: string[] = [];

  let total = 0;
  const errors: string[] = [];

  try {
    if (logId) lines = await updateProgress(admin, logId, synced, 0, startPage > 1 ? `Resuming from page ${startPage}...` : "Starting full sync...", lines);

    let hasMore = true;

    while (hasMore) {
      if (logId && await isCancelled(admin, logId)) {
        console.log("[sync-startups] Cancelled");
        lines = await updateProgress(admin, logId, synced, total, "Cancelled by user", lines);
        break;
      }

      const listRes = await listStartups({ page, limit: PAGE_SIZE, sort: "revenue-desc" });
      total = listRes.meta.total;
      hasMore = listRes.meta.hasMore;

      if (logId) lines = await updateProgress(admin, logId, synced, total, `Page ${page}: ${listRes.data.length} startups`, lines);

      for (const item of listRes.data) {
        if (logId && synced % 10 === 0 && await isCancelled(admin, logId)) break;

        try {
          const detail = await getStartupDetail(item.slug);
          await upsertStartup(admin, detail);
          await storeSnapshot(admin, detail);
          synced++;
          if (logId) {
            const line = `${synced}/${total} ${item.slug} OK`;
            lines = await updateProgress(admin, logId, synced, total, line, lines);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${item.slug}: ${msg}`);
          if (logId) lines = await updateProgress(admin, logId, synced, total, `${item.slug} FAILED: ${msg}`, lines);
        }
      }

      page++;
    }

    console.log(`[sync-startups] Done: ${synced}/${total}`);

    if (logId) {
      await updateSyncLog(admin, logId, "completed", {
        synced,
        page,
        total,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
        completed_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sync-startups] Fatal: ${msg}`);
    if (logId) {
      await updateSyncLog(admin, logId, "failed", {
        error: msg,
        synced,
        page,
        completed_at: new Date().toISOString(),
      });
    }
    process.exit(1);
  }
}

main();
