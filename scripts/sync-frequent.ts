/**
 * Frequent sync — catches newly listed startups (new/stale >30min).
 *
 * Schedule: every 30 minutes (via GitHub Actions)
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

async function main() {
  const admin = createAdminClient();
  const logId = await logSync(admin, "trustmrr_frequent_30min", "running");

  try {
    console.log("[sync-frequent] Fetching recent startups...");
    const page1 = await listStartups({ page: 1, limit: 50, sort: "listed-desc" });
    const page2 = await listStartups({ page: 2, limit: 50, sort: "listed-desc" });
    const recentStartups = [...page1.data, ...page2.data];

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const slugs = recentStartups.map((s) => s.slug);

    const { data: existing } = await admin
      .from("startups")
      .select("slug, synced_at")
      .in("slug", slugs);

    const syncedMap = new Map(
      (existing ?? []).map((s: { slug: string; synced_at: string | null }) => [s.slug, s.synced_at])
    );

    const toSync = recentStartups.filter((item) => {
      const lastSync = syncedMap.get(item.slug);
      return !lastSync || lastSync < thirtyMinAgo;
    });

    console.log(`[sync-frequent] ${toSync.length} new/stale, ${recentStartups.length - toSync.length} skipped`);

    let synced = 0;
    let lines: string[] = [];

    if (logId) {
      lines = await updateProgress(admin, logId, 0, toSync.length, `${toSync.length} to sync`, lines);
    }

    for (const item of toSync) {
      if (logId && await isCancelled(admin, logId)) {
        console.log("[sync-frequent] Cancelled");
        lines = await updateProgress(admin, logId, synced, toSync.length, "Cancelled by user", lines);
        break;
      }

      try {
        const detail = await getStartupDetail(item.slug);
        await upsertStartup(admin, detail);
        await storeSnapshot(admin, detail);
        synced++;
        const line = `${synced}/${toSync.length} ${item.slug} OK`;
        console.log(`[sync-frequent] ${line}`);
        if (logId) lines = await updateProgress(admin, logId, synced, toSync.length, line, lines);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[sync-frequent] ${item.slug} FAILED: ${msg}`);
        if (logId) lines = await updateProgress(admin, logId, synced, toSync.length, `${item.slug} FAILED: ${msg}`, lines);
      }
    }

    console.log(`[sync-frequent] Done: ${synced}/${toSync.length}`);

    if (logId) {
      await updateSyncLog(admin, logId, "completed", {
        checked: recentStartups.length,
        synced,
        completed_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sync-frequent] Fatal: ${msg}`);
    if (logId) {
      await updateSyncLog(admin, logId, "failed", {
        error: msg,
        completed_at: new Date().toISOString(),
      });
    }
    process.exit(1);
  }
}

main();
