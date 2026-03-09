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
import { getFollowerCount } from "@/lib/twitter/client";

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
        lines = await updateProgress(admin, logId, synced, total, "Cancelled by user", lines);
        break;
      }

      const listRes = await listStartups({ page, limit: PAGE_SIZE, sort: "revenue-desc" });
      total = listRes.meta.total;
      hasMore = listRes.meta.hasMore;

      if (logId) lines = await updateProgress(admin, logId, synced, total, `Page ${page}: ${listRes.data.length} startups`, lines);

      for (const item of listRes.data) {
        try {
          if (!existingSlugs.has(item.slug)) {
            const detail = await getStartupDetail(item.slug);
            await upsertStartup(admin, detail);
            await storeSnapshot(admin, detail);
            existingSlugs.add(item.slug);
            newCount++;
          } else {
            await upsertStartupFromList(admin, item);
            await storeSnapshot(admin, { ...item, isMerchantOfRecord: false, techStack: [] });
          }
          synced++;
          if (logId) lines = await updateProgress(admin, logId, synced, total, `${synced}/${total} ${item.slug} OK`, lines);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${item.slug}: ${msg}`);
          synced++;
          if (logId) lines = await updateProgress(admin, logId, synced, total, `${item.slug} FAILED: ${msg}`, lines);
        }
      }

      page++;
    }

    console.log(`[sync-daily] Done: ${synced} synced (${newCount} new)`);

    // Sync follower counts from twitterapi.io
    if (process.env.TWITTER_API_KEY) {
      if (logId) lines = await updateProgress(admin, logId, synced, total, "Syncing follower counts...", lines);

      const { data: handleRows } = await admin
        .from("startups")
        .select("x_handle")
        .not("x_handle", "is", null);

      const handles = [...new Set((handleRows ?? []).map((r) => r.x_handle as string))];
      let followersUpdated = 0;

      for (const handle of handles) {
        try {
          const count = await getFollowerCount(handle);
          if (count !== null) {
            await admin.from("startups").update({ x_follower_count: count }).eq("x_handle", handle);
            followersUpdated++;
          }
        } catch {
          // non-fatal, skip
        }
      }

      console.log(`[sync-daily] Followers: ${followersUpdated}/${handles.length} updated`);
      if (logId) lines = await updateProgress(admin, logId, synced, total, `Followers: ${followersUpdated}/${handles.length} updated`, lines);
    }

    if (logId) {
      await updateSyncLog(admin, logId, "completed", {
        synced, new_startups: newCount, total,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
        completed_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sync-daily] Fatal: ${msg}`);
    if (logId) {
      await updateSyncLog(admin, logId, "failed", { error: msg, synced, completed_at: new Date().toISOString() });
    }
    process.exit(1);
  }
}

main();
