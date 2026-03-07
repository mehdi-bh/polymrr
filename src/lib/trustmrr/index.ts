/**
 * TrustMRR Data Collector
 *
 * Self-contained module for fetching startup data from the TrustMRR API
 * and storing it in Supabase. No application logic — just data collection.
 *
 * Usage: called by cron routes in /api/cron/sync-startups and /api/cron/sync-frequent
 */

export {
  listStartups,
  getStartupDetail,
  type TrustMRRListItem,
  type TrustMRRDetail,
  type TrustMRRListResponse,
} from "./client";

export {
  upsertStartupFromList,
  upsertStartup,
  storeSnapshot,
  storeMrrHistory,
  logSync,
  updateSyncLog,
  updateProgress,
  isCancelled,
  getOrCreateLogId,
} from "./sync";
