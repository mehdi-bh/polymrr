/**
 * Daily full sync cron — syncs startups from TrustMRR.
 *
 * Strategy: paginate the list endpoint one page at a time (50/page).
 * For each startup, fetch detail (for xFollowerCount, techStack, cofounders)
 * and upsert. Stops before timeout and re-invokes with the same logId.
 *
 * Uses `x-page` header for continuation so we don't re-fetch pages.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  listStartups,
  getStartupDetail,
  upsertStartup,
  storeSnapshot,
  getOrCreateLogId,
  updateSyncLog,
  updateProgress,
  isCancelled,
} from "@/lib/trustmrr";
import { NextResponse, after } from "next/server";

export const maxDuration = 300;

const PAGE_SIZE = 50;
const SAFE_TIME_MS = 250_000; // stop 50s before maxDuration

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const logId = await getOrCreateLogId(admin, request, "trustmrr_full_daily");
  const startPage = parseInt(request.headers.get("x-page") ?? "1", 10);
  const startedAt = Date.now();

  // Carry over cumulative synced count from previous invocations
  let prevSynced = 0;
  let lines: string[] = [];
  if (logId && startPage > 1) {
    const { data: prevLog } = await admin.from("sync_log").select("details").eq("id", logId).maybeSingle();
    const prevDetails = prevLog?.details as { synced?: number; lines?: string[] } | null;
    prevSynced = prevDetails?.synced ?? 0;
    lines = prevDetails?.lines ?? [];
  }

  let synced = prevSynced;
  let page = startPage;
  let total = 0;
  const errors: string[] = [];

  try {
    if (logId) lines = await updateProgress(admin, logId, synced, 0, `Starting from page ${page}...`, lines);

    let hasMore = true;

    while (hasMore) {
      if (Date.now() - startedAt > SAFE_TIME_MS) {
        if (logId) lines = await updateProgress(admin, logId, synced, total, `Timeout — ${synced} synced, will continue from page ${page}`, lines);
        break;
      }

      if (logId && await isCancelled(admin, logId)) {
        if (logId) lines = await updateProgress(admin, logId, synced, total, "Cancelled by user", lines);
        hasMore = false;
        break;
      }

      const listRes = await listStartups({ page, limit: PAGE_SIZE, sort: "revenue-desc" });
      total = listRes.meta.total;
      hasMore = listRes.meta.hasMore;

      if (logId) lines = await updateProgress(admin, logId, synced, total, `Page ${page}: ${listRes.data.length} startups`, lines);

      for (const item of listRes.data) {
        if (Date.now() - startedAt > SAFE_TIME_MS) break;
        if (logId && synced % 10 === 0 && await isCancelled(admin, logId)) break;

        try {
          const detail = await getStartupDetail(item.slug);
          await upsertStartup(admin, detail);
          await storeSnapshot(admin, detail);
          synced++;
          if (logId) {
            const line = synced % 5 === 0 ? `${synced}/${total} ${item.slug} OK` : null;
            lines = await updateProgress(admin, logId, synced, total, line, lines);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${item.slug}: ${msg}`);
          if (logId) lines = await updateProgress(admin, logId, synced, total, `${item.slug} FAILED: ${msg}`, lines);
        }
      }

      if (Date.now() - startedAt > SAFE_TIME_MS) break;

      page++;
    }

    const done = !hasMore;
    console.log(`[sync-startups] ${synced} synced, page=${page}, done=${done}`);

    if (logId) {
      await updateSyncLog(admin, logId, done ? "completed" : "running", {
        synced,
        page,
        total,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
        ...(done ? { completed_at: new Date().toISOString() } : {}),
      });
    }

    // Re-invoke if there's more work
    if (!done) {
      const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";
      after(async () => {
        try {
          await fetch(`${baseUrl}/api/cron/sync-startups`, {
            method: "POST",
            headers: {
              authorization: `Bearer ${process.env.CRON_SECRET}`,
              ...(logId ? { "x-log-id": String(logId) } : {}),
              "x-page": String(page),
            },
          });
        } catch (err) {
          console.error("[sync-startups] Re-invoke failed:", err);
        }
      });
    }

    return NextResponse.json({ ok: true, synced, page, total, done });
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

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
