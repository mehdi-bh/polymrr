/**
 * Lightweight daily sync — updates all startups using the list endpoint only.
 *
 * Schedule: 2:00 AM UTC daily
 * Strategy: paginate the list endpoint (no detail calls needed for existing startups).
 *           Only fetches detail for NEW startups not yet in our DB.
 *           ~100 API calls for 5000 startups (vs ~5000 with full sync).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  listStartups,
  getStartupDetail,
  upsertStartupFromList,
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
const SAFE_TIME_MS = 250_000;

// Vercel cron sends GET, admin dashboard sends POST
export async function GET(request: Request) { return handler(request); }
export async function POST(request: Request) { return handler(request); }

async function handler(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const logId = await getOrCreateLogId(admin, request, "sync_daily");
  const startPage = parseInt(request.headers.get("x-page") ?? "1", 10);
  const startedAt = Date.now();

  // Carry over cumulative count from previous invocations
  let prevSynced = 0;
  let prevNewCount = 0;
  let lines: string[] = [];
  if (logId && startPage > 1) {
    const { data: prevLog } = await admin.from("sync_log").select("details").eq("id", logId).maybeSingle();
    const prev = prevLog?.details as { synced?: number; new_startups?: number; lines?: string[] } | null;
    prevSynced = prev?.synced ?? 0;
    prevNewCount = prev?.new_startups ?? 0;
    lines = prev?.lines ?? [];
  }

  // Load existing slugs to detect new startups
  const { data: existingRows } = await admin.from("startups").select("slug");
  const existingSlugs = new Set((existingRows ?? []).map((r) => r.slug));

  let synced = prevSynced;
  let newCount = prevNewCount;
  let page = startPage;
  let total = 0;
  const errors: string[] = [];

  try {
    if (logId) lines = await updateProgress(admin, logId, synced, 0, `Starting from page ${page}...`, lines);

    let hasMore = true;

    while (hasMore) {
      if (Date.now() - startedAt > SAFE_TIME_MS) {
        if (logId) lines = await updateProgress(admin, logId, synced, total, `Timeout — ${synced} synced, continuing from page ${page}`, lines);
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

        try {
          const isNew = !existingSlugs.has(item.slug);

          if (isNew) {
            // New startup — fetch detail for xFollowerCount, techStack, cofounders
            const detail = await getStartupDetail(item.slug);
            await upsertStartup(admin, detail);
            await storeSnapshot(admin, detail);
            existingSlugs.add(item.slug);
            newCount++;
            synced++;
            if (logId) lines = await updateProgress(admin, logId, synced, total, `${synced}/${total} ${item.slug} NEW`, lines);
          } else {
            // Existing startup — update from list data (no API call)
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

      if (Date.now() - startedAt > SAFE_TIME_MS) break;

      // Log line every 5 pages for existing startups
      if (page % 5 === 0 && logId) {
        lines = await updateProgress(admin, logId, synced, total, `${synced}/${total} synced (${newCount} new)`, lines);
      }

      page++;
    }

    const done = !hasMore;
    console.log(`[sync-daily] ${synced} synced (${newCount} new), page=${page}, done=${done}`);

    if (logId) {
      await updateSyncLog(admin, logId, done ? "completed" : "running", {
        synced,
        new_startups: newCount,
        page,
        total,
        errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
        ...(done ? { completed_at: new Date().toISOString() } : {}),
      });
    }

    if (!done) {
      const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";
      after(async () => {
        try {
          await fetch(`${baseUrl}/api/cron/sync-daily`, {
            method: "POST",
            headers: {
              authorization: `Bearer ${process.env.CRON_SECRET}`,
              ...(logId ? { "x-log-id": String(logId) } : {}),
              "x-page": String(page),
            },
          });
        } catch (err) {
          console.error("[sync-daily] Re-invoke failed:", err);
        }
      });
    }

    return NextResponse.json({ ok: true, synced, new_startups: newCount, page, total, done });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sync-daily] Fatal: ${msg}`);

    if (logId) {
      await updateSyncLog(admin, logId, "failed", {
        error: msg,
        synced,
        new_startups: newCount,
        page,
        completed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
