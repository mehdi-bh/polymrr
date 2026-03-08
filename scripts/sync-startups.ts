/**
 * Full startup backfill — fetches detail for every startup.
 * Manual only (via GitHub Actions workflow_dispatch).
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
  const logId = await logSync(admin, "trustmrr_full_daily", "running");

  let synced = 0;
  let page = 1;
  let total = 0;
  let lines: string[] = [];
  const errors: string[] = [];

  try {
    if (logId) lines = await updateProgress(admin, logId, 0, 0, "Starting full sync...", lines);

    let hasMore = true;

    while (hasMore) {
      if (logId && await isCancelled(admin, logId)) {
        lines = await updateProgress(admin, logId, synced, total, "Cancelled by user", lines);
        break;
      }

      const listRes = await listStartups({ page, limit: PAGE_SIZE, sort: "revenue-desc" });
      total = listRes.meta.total;
      hasMore = listRes.meta.hasMore;

      if (logId) lines = await updateProgress(admin, logId, synced, total, `Page ${page}: ${listRes.data.length} startups`, lines);

      for (const item of listRes.data) {
        try {
          const detail = await getStartupDetail(item.slug);
          await upsertStartup(admin, detail);
          await storeSnapshot(admin, detail);
          synced++;
          if (logId) lines = await updateProgress(admin, logId, synced, total, `${synced}/${total} ${item.slug} OK`, lines);
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
        synced, total,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
        completed_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sync-startups] Fatal: ${msg}`);
    if (logId) {
      await updateSyncLog(admin, logId, "failed", { error: msg, synced, completed_at: new Date().toISOString() });
    }
    process.exit(1);
  }
}

main();
