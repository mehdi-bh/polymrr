/**
 * Lightweight daily sync — updates all startups using the list endpoint.
 * Only fetches detail for NEW startups not yet in the DB.
 *
 * Schedule: 2:00 AM UTC daily (via GitHub Actions)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  listStartups,
  getStartupDetail,
  upsertStartupFromList,
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
  const logId = await logSync(admin, "sync_daily", "running");

  const { data: existingRows } = await admin.from("startups").select("slug");
  const existingSlugs = new Set((existingRows ?? []).map((r) => r.slug));

  let synced = 0;
  let newCount = 0;
  let page = 1;
  let total = 0;
  let lines: string[] = [];
  const errors: string[] = [];

  try {
    if (logId) lines = await updateProgress(admin, logId, 0, 0, "Starting sync...", lines);

    let hasMore = true;

    while (hasMore) {
      if (logId && await isCancelled(admin, logId)) {
        console.log("[sync-daily] Cancelled");
        lines = await updateProgress(admin, logId, synced, total, "Cancelled by user", lines);
        break;
      }

      const listRes = await listStartups({ page, limit: PAGE_SIZE, sort: "revenue-desc" });
      total = listRes.meta.total;
      hasMore = listRes.meta.hasMore;

      if (logId) lines = await updateProgress(admin, logId, synced, total, `Page ${page}: ${listRes.data.length} startups`, lines);

      for (const item of listRes.data) {
        try {
          const isNew = !existingSlugs.has(item.slug);

          if (isNew) {
            const detail = await getStartupDetail(item.slug);
            await upsertStartup(admin, detail);
            await storeSnapshot(admin, detail);
            existingSlugs.add(item.slug);
            newCount++;
            synced++;
            if (logId) lines = await updateProgress(admin, logId, synced, total, `${synced}/${total} ${item.slug} NEW`, lines);
          } else {
            await upsertStartupFromList(admin, item);
            await storeSnapshot(admin, {
              ...item,
              xFollowerCount: null,
              isMerchantOfRecord: false,
              techStack: [],
              cofounders: [],
            });
            synced++;
            if (logId) lines = await updateProgress(admin, logId, synced, total, null, lines);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${item.slug}: ${msg}`);
          synced++;
          if (logId) lines = await updateProgress(admin, logId, synced, total, `${item.slug} FAILED: ${msg}`, lines);
        }
      }

      if (page % 5 === 0) {
        console.log(`[sync-daily] ${synced}/${total} synced (${newCount} new)`);
        if (logId) lines = await updateProgress(admin, logId, synced, total, `${synced}/${total} synced (${newCount} new)`, lines);
      }

      page++;
    }

    console.log(`[sync-daily] Done: ${synced} synced (${newCount} new)`);

    if (logId) {
      await updateSyncLog(admin, logId, "completed", {
        synced,
        new_startups: newCount,
        total,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
        completed_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sync-daily] Fatal: ${msg}`);
    if (logId) {
      await updateSyncLog(admin, logId, "failed", {
        error: msg,
        synced,
        new_startups: newCount,
        completed_at: new Date().toISOString(),
      });
    }
    process.exit(1);
  }
}

main();
