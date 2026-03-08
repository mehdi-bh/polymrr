/**
 * TrustMRR Data Collector
 *
 * Fetches startup data from the TrustMRR API and stores it in Supabase.
 * Used by scripts in /scripts/ (run via GitHub Actions).
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
} from "./sync";
