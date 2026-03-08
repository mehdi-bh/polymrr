/**
 * MRR history scraper — populates mrr_history with historical data.
 * Sorted by highest revenue first. 3s base delay + adaptive backoff on 429s.
 * ~5000 startups at 3s → ~4.5 hours.
 *
 * Schedule: 3:00 AM UTC daily (via GitHub Actions)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeMrrHistory, getAdaptiveDelay } from "@/lib/scraper";
import {
  storeMrrHistory,
  logSync,
  updateSyncLog,
  updateProgress,
  isCancelled,
} from "@/lib/trustmrr";

const BASE_DELAY_MS = 3_000;
const BACKOFF_DELAY_MS = 60_000;
const MAX_CONSECUTIVE_FAILURES = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const admin = createAdminClient();
  const logId = await logSync(admin, "mrr_scrape", "running");

  try {
    const { data: allStartups } = await admin
      .from("startups")
      .select("slug")
      .order("revenue_total", { ascending: false });
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
    let noData = 0;
    let processed = 0;
    let consecutiveFailures = 0;
    const errors: string[] = [];
    let lines: string[] = [];

    console.log(`[scrape-mrr] ${neverScraped.length} new, ${stale.length} stale, ${toScrape.length} total`);
    if (logId)
      lines = await updateProgress(admin, logId, 0, toScrape.length, `${neverScraped.length} new, ${stale.length} stale`, lines);

    for (const { slug } of toScrape) {
      if (logId && (await isCancelled(admin, logId))) break;
      processed++;

      try {
        const points = await scrapeMrrHistory(slug);
        if (points?.length) {
          await storeMrrHistory(admin, slug, points);
          succeeded++;
          consecutiveFailures = 0;
          if (logId) lines = await updateProgress(admin, logId, processed, toScrape.length, `${processed}/${toScrape.length} ${slug}: ${points.length} months`, lines);
        } else {
          noData++;
          consecutiveFailures = 0;
          if (logId) lines = await updateProgress(admin, logId, processed, toScrape.length, `${processed}/${toScrape.length} ${slug}: no data`, lines);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${slug}: ${msg}`);
        consecutiveFailures++;
        if (logId) lines = await updateProgress(admin, logId, processed, toScrape.length, `${processed}/${toScrape.length} ${slug}: FAILED ${msg}`, lines);
      }

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.warn(`[scrape-mrr] ${consecutiveFailures} consecutive failures, cooling down 60s`);
        if (logId) lines = await updateProgress(admin, logId, processed, toScrape.length, `Cooling down 60s after ${consecutiveFailures} failures`, lines);
        await sleep(BACKOFF_DELAY_MS);
        consecutiveFailures = 0;
      } else {
        await sleep(BASE_DELAY_MS + getAdaptiveDelay());
      }
    }

    const failed = errors.length;
    const status = failed === 0 || failed < toScrape.length * 0.1 ? "completed" : "partial";
    console.log(`[scrape-mrr] Done: ${succeeded} scraped, ${noData} no data, ${failed} failed / ${toScrape.length} total`);

    if (logId) {
      await updateSyncLog(admin, logId, status, {
        total: toScrape.length, succeeded, no_data: noData, failed,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
        completed_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[scrape-mrr] Fatal: ${msg}`);
    if (logId) await updateSyncLog(admin, logId, "failed", { error: msg, completed_at: new Date().toISOString() });
    process.exit(1);
  }
}

main();
