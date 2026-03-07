/**
 * MRR history scraper cron — populates mrr_history with historical data.
 *
 * Schedule: 3:00 AM UTC daily (after the full sync at 2 AM)
 * Strategy: scrape revenue history from TrustMRR pages for startups
 *           that haven't been scraped yet or are stale (>7 days).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeMrrHistory } from "@/lib/scraper";
import { storeMrrHistory, getOrCreateLogId, updateSyncLog, updateProgress, isCancelled } from "@/lib/trustmrr";
import { NextResponse } from "next/server";

export const maxDuration = 300;

const MAX_PER_RUN = 50;
const DELAY_MS = 1500;

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const logId = await getOrCreateLogId(admin, request, "mrr_scrape");

  try {
    const { data: allStartups } = await admin
      .from("startups")
      .select("slug");

    if (!allStartups?.length) {
      throw new Error("No startups in database. Run full sync first.");
    }

    // Find latest scraped date per startup
    const { data: latestRows } = await admin
      .from("mrr_history")
      .select("startup_slug")
      .order("date", { ascending: false });

    const scraped = new Set((latestRows ?? []).map((r) => r.startup_slug));

    // Prioritize: never-scraped first, then all startups (re-scrape weekly)
    const neverScraped = allStartups.filter((s) => !scraped.has(s.slug));
    const stale = allStartups.filter((s) => scraped.has(s.slug));
    const toScrape = [...neverScraped, ...stale].slice(0, MAX_PER_RUN);

    console.log(
      `[scrape-mrr] ${neverScraped.length} new, ${stale.length} stale, scraping ${toScrape.length}`
    );

    let succeeded = 0;
    const errors: string[] = [];
    let lines: string[] = [];
    let processed = 0;

    if (logId) {
      lines = await updateProgress(admin, logId, 0, toScrape.length, `${neverScraped.length} new, ${stale.length} stale, scraping ${toScrape.length}`, lines);
    }

    for (const { slug } of toScrape) {
      if (logId && await isCancelled(admin, logId)) {
        console.log("[scrape-mrr] Cancelled by user");
        lines = await updateProgress(admin, logId, processed, toScrape.length, "Cancelled by user", lines);
        break;
      }

      processed++;
      try {
        const points = await scrapeMrrHistory(slug);

        if (points && points.length > 0) {
          await storeMrrHistory(admin, slug, points);
          succeeded++;
          const line = `${processed}/${toScrape.length} ${slug}: ${points.length} months stored`;
          console.log(`[scrape-mrr] ${line}`);
          if (logId) lines = await updateProgress(admin, logId, processed, toScrape.length, line, lines);
        } else {
          const line = `${processed}/${toScrape.length} ${slug}: no data`;
          console.log(`[scrape-mrr] ${line}`);
          if (logId) lines = await updateProgress(admin, logId, processed, toScrape.length, line, lines);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const line = `${processed}/${toScrape.length} ${slug}: FAILED ${msg}`;
        console.error(`[scrape-mrr] ${line}`);
        errors.push(`${slug}: ${msg}`);
        if (logId) lines = await updateProgress(admin, logId, processed, toScrape.length, line, lines);
      }

      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    const summary = {
      total: toScrape.length,
      succeeded,
      pending: Math.max(
        0,
        neverScraped.length + stale.length - MAX_PER_RUN
      ),
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      completed_at: new Date().toISOString(),
    };

    console.log(`[scrape-mrr] Done: ${succeeded}/${toScrape.length}`);

    if (logId) await updateSyncLog(admin, logId, summary.pending > 0 ? "running" : "completed", summary);

    // Self-re-invoke if there's remaining work, passing logId for dashboard tracking
    if (summary.pending > 0) {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
      fetch(`${baseUrl}/api/cron/scrape-mrr`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.CRON_SECRET}`,
          ...(logId ? { "x-log-id": String(logId) } : {}),
        },
      }).catch(() => {}); // fire-and-forget
    }

    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[scrape-mrr] Fatal: ${msg}`);

    if (logId) {
      await updateSyncLog(admin, logId, "failed", {
        error: msg,
        completed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
