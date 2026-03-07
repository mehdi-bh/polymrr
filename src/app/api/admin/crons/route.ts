import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logSync } from "@/lib/trustmrr";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return false;
  return user.email === process.env.ADMIN_EMAIL;
}

const CRON_JOBS = [
  { id: "sync-startups", path: "/api/cron/sync-startups", source: "trustmrr_full_daily" },
  { id: "sync-frequent", path: "/api/cron/sync-frequent", source: "trustmrr_frequent_30min" },
  { id: "scrape-mrr", path: "/api/cron/scrape-mrr", source: "mrr_scrape" },
  { id: "generate-markets", path: "/api/cron/generate-markets", source: "generate_markets" },
  { id: "resolve-markets", path: "/api/cron/resolve-markets", source: "resolve_markets" },
];

// GET — fetch sync_log history
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Auto-clean stale "running" entries (older than 10 minutes)
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await admin
    .from("sync_log")
    .update({ status: "stale" })
    .eq("status", "running")
    .lt("created_at", tenMinAgo);

  const { data: logs } = await admin
    .from("sync_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const { count: startupCount } = await admin
    .from("startups")
    .select("*", { count: "exact", head: true });

  const { count: marketCount } = await admin
    .from("markets")
    .select("*", { count: "exact", head: true });

  const { count: snapshotCount } = await admin
    .from("startup_snapshots")
    .select("*", { count: "exact", head: true });

  const { count: historyCount } = await admin
    .from("mrr_history")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    jobs: CRON_JOBS,
    logs: logs ?? [],
    stats: {
      startups: startupCount ?? 0,
      markets: marketCount ?? 0,
      snapshots: snapshotCount ?? 0,
      mrrHistory: historyCount ?? 0,
    },
  });
}

// PATCH — cancel a running cron job
export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { logId } = await request.json();
  if (!logId) {
    return NextResponse.json({ error: "Missing logId" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from("sync_log")
    .update({ status: "cancelled" })
    .eq("id", logId)
    .eq("status", "running");

  return NextResponse.json({ ok: true });
}

// POST — trigger a cron job manually
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await request.json();
  const job = CRON_JOBS.find((j) => j.id === jobId);
  if (!job) {
    return NextResponse.json({ error: "Unknown job" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create the sync_log entry HERE so the client can poll it immediately
  const logId = await logSync(admin, job.source, "running");

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  // Fire-and-forget — pass logId so the cron reuses it instead of creating a new one
  fetch(`${baseUrl}${job.path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET}`,
      "x-log-id": String(logId),
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, logId });
}
