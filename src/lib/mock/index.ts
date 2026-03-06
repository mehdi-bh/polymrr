// ---------------------------------------------------------------------------
// Mock data access layer.
// Every function here mirrors what a real API / DB query would return.
// To switch to a real backend: replace these implementations, keep the
// function signatures.
// ---------------------------------------------------------------------------

export { startups, mrrHistories } from "./startups";
export { markets } from "./markets";
export { users, currentUser, bets, leaderboard, feedItems, pnlHistories } from "./users";
