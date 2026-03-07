"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, RefreshCw, CheckCircle, XCircle, Clock, Loader2, Database, Square } from "lucide-react";

interface CronJob {
  id: string;
  path: string;
  source: string;
}

interface SyncLog {
  id: number;
  source: string;
  status: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface Stats {
  startups: number;
  markets: number;
  snapshots: number;
  mrrHistory: number;
}

const SCHEDULES: Record<string, string> = {
  "sync-startups": "Daily 2:00 AM UTC",
  "sync-frequent": "Every 30 min",
  "scrape-mrr": "Daily 3:00 AM UTC",
  "generate-markets": "Daily 4:00 AM UTC",
  "resolve-markets": "Daily midnight UTC",
};

const DESCRIPTIONS: Record<string, string> = {
  "sync-startups": "Full sync of all startups from TrustMRR",
  "sync-frequent": "Quick sync of recently listed startups",
  "scrape-mrr": "Scrape historical MRR data from TrustMRR pages",
  "generate-markets": "Auto-generate prediction markets from startup data",
  "resolve-markets": "Close expired markets and resolve outcomes",
};

function statusIcon(status: string) {
  switch (status) {
    case "completed": return <CheckCircle className="h-4 w-4 text-yes" />;
    case "failed": return <XCircle className="h-4 w-4 text-no" />;
    case "running": return <Loader2 className="h-4 w-4 text-warning animate-spin" />;
    case "cancelled": return <Square className="h-4 w-4 text-base-content/50" />;
    case "stale": return <XCircle className="h-4 w-4 text-base-content/40" />;
    case "partial": return <Clock className="h-4 w-4 text-warning" />;
    default: return <Clock className="h-4 w-4 text-base-content/50" />;
  }
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-success/10 text-yes",
  failed: "bg-error/10 text-no",
  running: "bg-warning/10 text-warning",
  partial: "bg-warning/10 text-warning",
  cancelled: "bg-base-300 text-base-content/50",
  stale: "bg-base-300 text-base-content/40",
};

function statusBadge(status: string) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold uppercase ${STATUS_COLORS[status] ?? "bg-base-300 text-base-content/50"}`}>
      {statusIcon(status)}
      {status}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TERMINAL_STATUSES = new Set(["completed", "failed", "partial", "stale"]);

function ProgressTerminal({ logId, onDone }: { logId: number; onDone: () => void }) {
  const [log, setLog] = useState<SyncLog | null>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledCountRef = useRef(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/crons/progress?id=${logId}`);
        if (!res.ok) return;
        const { log: data } = await res.json();
        if (!data) return;

        setLog(data);

        if (TERMINAL_STATUSES.has(data.status)) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onDone();
          return;
        }

        if (data.status === "cancelled") {
          cancelledCountRef.current++;
          if (cancelledCountRef.current >= 3) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            onDone();
          }
        }
      } catch {}
    };

    poll();
    intervalRef.current = setInterval(poll, 1500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [logId, onDone]);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [log?.details]);

  const details = log?.details as { processed?: number; total?: number; lines?: string[] } | null;
  const lines = details?.lines ?? [];
  const processed = details?.processed ?? 0;
  const total = details?.total ?? 0;
  const isRunning = !log || log.status === "running";
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="mt-3 rounded-lg border border-base-300 bg-neutral overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-base-300/50 bg-neutral-focus/50">
        <div className="flex items-center gap-2 text-xs">
          {isRunning ? (
            <Loader2 className="h-3.5 w-3.5 text-warning animate-spin" />
          ) : log?.status === "cancelled" ? (
            <Square className="h-3.5 w-3.5 text-base-content/50" />
          ) : log?.status === "completed" || log?.status === "partial" ? (
            <CheckCircle className="h-3.5 w-3.5 text-yes" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-no" />
          )}
          <span className="mono-num text-base-content/70">
            {processed}/{total} ({pct}%)
          </span>
        </div>
        {isRunning && total > 0 && (
          <div className="h-1.5 w-32 rounded-full bg-base-300/30 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      <div ref={termRef} className="max-h-64 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
        {lines.length === 0 && isRunning && (
          <div className="text-base-content/30">Starting...</div>
        )}
        {lines.map((line, i) => (
          <div key={i} className={/FAILED|error/i.test(line) ? "text-no" : /OK$|stored$/.test(line) ? "text-base-content/70" : "text-base-content/50"}>
            {line}
          </div>
        ))}
        {isRunning && <div className="inline-block w-2 h-4 bg-primary/70 animate-pulse" />}
      </div>
    </div>
  );
}

export function CronDashboard() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeJobs, setActiveJobs] = useState<Record<string, number>>({}); // jobId -> logId
  const [stoppingJobs, setStoppingJobs] = useState<Set<string>>(new Set());
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/crons");
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs);
      setLogs(data.logs);
      setStats(data.stats);

      // Auto-attach terminal to any currently running jobs
      const runningLogs = (data.logs as SyncLog[]).filter((l) => l.status === "running");
      if (runningLogs.length > 0) {
        setActiveJobs((prev) => {
          const next = { ...prev };
          for (const log of runningLogs) {
            const job = (data.jobs as CronJob[]).find((j) => j.source === log.source);
            if (job && !(job.id in next)) {
              next[job.id] = log.id;
            }
          }
          return next;
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function triggerJob(jobId: string) {
    try {
      const res = await fetch("/api/admin/crons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (data.ok && data.logId) {
        setActiveJobs((prev) => ({ ...prev, [jobId]: data.logId }));
      }
    } catch {}
  }

  async function stopJob(jobId: string) {
    const logId = activeJobs[jobId];
    if (!logId) return;
    setStoppingJobs((prev) => new Set(prev).add(jobId));
    try {
      await fetch("/api/admin/crons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId }),
      });
    } catch {}
  }

  const handleJobDone = useCallback((jobId: string) => {
    setActiveJobs((prev) => { const next = { ...prev }; delete next[jobId]; return next; });
    setStoppingJobs((prev) => { const next = new Set(prev); next.delete(jobId); return next; });
    fetchData();
  }, [fetchData]);

  function getLastRun(source: string): SyncLog | undefined {
    return logs.find((l) => l.source === source);
  }

  if (loading && jobs.length === 0) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-base-content/50" /></div>;
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Startups", value: stats.startups },
            { label: "Markets", value: stats.markets },
            { label: "Snapshots", value: stats.snapshots },
            { label: "MRR History", value: stats.mrrHistory },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-base-300 bg-base-100 p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-base-content/50">
                <Database className="h-3.5 w-3.5" />
                {s.label}
              </div>
              <div className="mono-num mt-1 text-2xl font-bold">{s.value.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Jobs</h2>
          <button onClick={fetchData} disabled={loading} className="btn btn-ghost btn-sm gap-1">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="space-y-2">
          {jobs.map((job) => {
            const lastRun = getLastRun(job.source);
            const isActive = job.id in activeJobs;

            return (
              <div key={job.id} className="rounded-xl border border-base-300 bg-base-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold">{job.id}</div>
                    <div className="text-xs text-base-content/50">{DESCRIPTIONS[job.id]}</div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-base-content/50">
                      <span>{SCHEDULES[job.id]}</span>
                      <span className="font-mono">{job.path}</span>
                    </div>
                  </div>
                  {isActive ? (
                    <button
                      onClick={() => stopJob(job.id)}
                      disabled={stoppingJobs.has(job.id)}
                      className="btn btn-error btn-sm gap-1 shrink-0"
                    >
                      {stoppingJobs.has(job.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                      {stoppingJobs.has(job.id) ? "Stopping..." : "Stop"}
                    </button>
                  ) : (
                    <button onClick={() => triggerJob(job.id)} className="btn btn-primary btn-sm gap-1 shrink-0">
                      <Play className="h-4 w-4" />
                      Run
                    </button>
                  )}
                </div>

                {isActive && (
                  <ProgressTerminal logId={activeJobs[job.id]} onDone={() => handleJobDone(job.id)} />
                )}

                {!isActive && lastRun && (
                  <div
                    className={`mt-3 flex items-center gap-3 text-xs ${lastRun.status === "running" ? "cursor-pointer hover:opacity-80" : ""}`}
                    onClick={() => {
                      if (lastRun.status === "running") {
                        setActiveJobs((prev) => ({ ...prev, [job.id]: lastRun.id }));
                      }
                    }}
                  >
                    {statusBadge(lastRun.status)}
                    <span className="text-base-content/50">{timeAgo(lastRun.created_at)}</span>
                    {lastRun.details && (
                      <span className="font-mono text-base-content/50">
                        {Object.entries(lastRun.details)
                          .filter(([k]) => !["error", "errors", "completed_at", "lines"].includes(k))
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" | ")}
                      </span>
                    )}
                    {lastRun.status === "running" && (
                      <span className="text-warning text-[11px]">click to view</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold">Recent Logs</h2>
        <div className="overflow-x-auto rounded-xl border border-base-300">
          <table className="table table-xs w-full">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-base-content/50">
                <th>Time</th>
                <th>Source</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const details = log.details as Record<string, unknown> | null;
                const displayDetails = details
                  ? Object.entries(details).filter(([k]) => !["errors", "completed_at", "lines"].includes(k))
                  : [];

                return (
                  <tr key={log.id} className="cursor-pointer hover:bg-base-300/30"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                    <td className="mono-num whitespace-nowrap text-xs text-base-content/50">{timeAgo(log.created_at)}</td>
                    <td className="text-xs font-medium">{log.source}</td>
                    <td>{statusBadge(log.status)}</td>
                    <td className="text-xs text-base-content/50">
                      {expandedLog === log.id ? (
                        <div className="space-y-2">
                          <div className="font-mono text-[11px]">
                            {displayDetails.map(([k, v]) => `${k}: ${v}`).join(" | ")}
                          </div>
                          {Array.isArray(details?.lines) && (
                            <div className="max-h-48 overflow-y-auto rounded bg-neutral p-2 font-mono text-[11px] leading-relaxed">
                              {(details.lines as string[]).map((line, i) => (
                                <div key={i} className={/FAILED/i.test(line) ? "text-no" : "text-base-content/60"}>{line}</div>
                              ))}
                            </div>
                          )}
                          {Array.isArray(details?.errors) && (
                            <div className="rounded bg-error/5 p-2 font-mono text-[11px] text-no">
                              {(details.errors as string[]).map((e, i) => <div key={i}>{e}</div>)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="font-mono">
                          {displayDetails.slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" | ") || "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr><td colSpan={4} className="text-center text-sm text-base-content/50 py-8">No sync logs yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
