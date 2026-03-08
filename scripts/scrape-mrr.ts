/**
 * MRR history scraper — populates mrr_history with historical data.
 *
 * Schedule: 3:00 AM UTC daily (via GitHub Actions)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeMrrHistory } from "@/lib/scraper";
import { storeMrrHistory, logSync, updateSyncLog, updateProgress, isCancelled } from "@/lib/trustmrr";

const DELAY_MS = 1500;

async function main() {
  const admin = createAdminClient();
  const logId = await logSync(admin, "mrr_scrape", "running");

  try {
    const { data: allStartups } = await admin.from("startups").select("slug");
    if (!allStartups?.length) throw new Error("No startups in database.");

    const { data: latestRows } = await admin
      .from("mrr_history")
      .select("startup_slug")
      .order("date", { ascending: false });

    const scraped = new Set((latestRows ?? []).map((r) => r.startup_slug));
    const neverScraped = allStartups.filter((s) => !scraped.has(s.slug));
    const stale = allStartups.filter((s) => scraped.has(s.slug));
    const toScrape = [...neverScraped, ...stale];

    let succeeded = 0;
    let processed = 0;
    const errors: string[] = [];
    let lines: string[] = [];

    if (logId) lines = await updateProgress(admin, logId, 0, toScrape.length, `${neverScraped.length} new, ${stale.length} stale`, lines);

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
          if (logId) lines = await updateProgress(admin, logId, processed, toScrape.length, `${processed}/${toScrape.length} ${slug}: no data`, lines);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${slug}: ${msg}`);
        if (logId) lines = await updateProgress(admin, logId, processed, toScrape.length, `${processed}/${toScrape.length} ${slug}: FAILED ${msg}`, lines);
      }

      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    console.log(`[scrape-mrr] Done: ${succeeded}/${toScrape.length}`);

    if (logId) {
      await updateSyncLog(admin, logId, "completed", {
        total: toScrape.length, succeeded,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        completed_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[scrape-mrr] Fatal: ${msg}`);
    if (logId) {
      await updateSyncLog(admin, logId, "failed", { error: msg, completed_at: new Date().toISOString() });
    }
    process.exit(1);
  }
}

main();
