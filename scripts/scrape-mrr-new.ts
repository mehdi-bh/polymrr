/**
 * MRR history scraper for new startups only.
 *
 * Fetches historical MRR data for startups that have no entries in mrr_history yet.
 * Designed to run after sync-daily picks up new startups.
 *
 * Schedule: 5:00 AM UTC daily (via GitHub Actions)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeMrrHistory } from "@/lib/scraper";
import { storeMrrHistory, logSync, updateSyncLog, updateProgress, isCancelled } from "@/lib/trustmrr";

const DELAY_MS = 3000;

async function main() {
  const admin = createAdminClient();
  const logId = await logSync(admin, "mrr_scrape_new", "running");

  try {
    const { data: covered } = await admin
      .from("mrr_history")
      .select("startup_slug")
      .then(({ data }) => ({ data: [...new Set((data ?? []).map((r) => r.startup_slug))] }));

    const coveredSet = new Set(covered ?? []);

    const { data: allStartups } = await admin.from("startups").select("slug");
    const toScrape = (allStartups ?? []).filter((s) => !coveredSet.has(s.slug));

    if (toScrape.length === 0) {
      console.log("[scrape-mrr-new] No new startups to scrape.");
      if (logId) await updateSyncLog(admin, logId, "completed", { total: 0, succeeded: 0, completed_at: new Date().toISOString() });
      return;
    }

    let succeeded = 0;
    let noData = 0;
    let processed = 0;
    const errors: string[] = [];
    let lines: string[] = [];

    if (logId) lines = await updateProgress(admin, logId, 0, toScrape.length, `${toScrape.length} new startups to scrape`, lines);

    for (const { slug } of toScrape) {
      if (logId && await isCancelled(admin, logId)) break;

      processed++;
      try {
        const points = await scrapeMrrHistory(slug);
        if (points && points.length > 0) {
          await storeMrrHistory(admin, slug, points);
          succeeded++;
          if (logId) lines = await updateProgress(admin, logId, processed, toScrape.length, `${processed}/${toScrape.length} ${slug}: ${points.length} months`, lines);
        } else {
          noData++;
          if (logId) lines = await updateProgress(admin, logId, processed, toScrape.length, `${processed}/${toScrape.length} ${slug}: no data`, lines);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${slug}: ${msg}`);
        if (logId) lines = await updateProgress(admin, logId, processed, toScrape.length, `${processed}/${toScrape.length} ${slug}: FAILED ${msg}`, lines);
      }

      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    const failed = errors.length;
    const status = failed === 0 ? "completed" : "partial";
    console.log(`[scrape-mrr-new] Done: ${succeeded} scraped, ${noData} no data, ${failed} failed / ${toScrape.length} total`);

    if (logId) {
      await updateSyncLog(admin, logId, status, {
        total: toScrape.length, succeeded, no_data: noData, failed,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
        completed_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[scrape-mrr-new] Fatal: ${msg}`);
    if (logId) {
      await updateSyncLog(admin, logId, "failed", { error: msg, completed_at: new Date().toISOString() });
    }
    process.exit(1);
  }
}

main();
