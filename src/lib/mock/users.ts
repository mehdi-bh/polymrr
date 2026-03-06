import { User, Bet, LeaderboardEntry, FeedItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mock users
// ---------------------------------------------------------------------------

export const users: User[] = [
  { id: "u1", xHandle: "sarahbuilds", xName: "Sarah Chen", avatarUrl: "", credits: 2400, joinedAt: "2025-10-01T00:00:00.000Z" },
  { id: "u2", xHandle: "indiejan", xName: "Jan de Vries", avatarUrl: "", credits: 1850, joinedAt: "2025-09-15T00:00:00.000Z" },
  { id: "u3", xHandle: "marc_louvion", xName: "Marc Lou", avatarUrl: "", credits: 3200, joinedAt: "2025-08-01T00:00:00.000Z" },
  { id: "u4", xHandle: "dannypostmaa", xName: "Danny Postma", avatarUrl: "", credits: 980, joinedAt: "2025-11-01T00:00:00.000Z" },
  { id: "u5", xHandle: "tdinh_me", xName: "Tony Dinh", avatarUrl: "", credits: 4100, joinedAt: "2025-08-20T00:00:00.000Z" },
  { id: "u6", xHandle: "katynkaa", xName: "Katya Sorokina", avatarUrl: "", credits: 1600, joinedAt: "2025-12-01T00:00:00.000Z" },
  { id: "u7", xHandle: "jdnoc", xName: "John Noc", avatarUrl: "", credits: 2900, joinedAt: "2025-10-15T00:00:00.000Z" },
  { id: "u8", xHandle: "alexwest", xName: "Alex West", avatarUrl: "", credits: 750, joinedAt: "2026-01-01T00:00:00.000Z" },
];

// The "current user" for mock auth — toggle this to simulate logged-in state.
export const currentUser: User | null = users[0];

// ---------------------------------------------------------------------------
// Mock bets
// ---------------------------------------------------------------------------

export const bets: Bet[] = [
  { id: "b1", marketId: "m1", userId: "u1", side: "yes", amount: 200, oddsAtTime: 70, createdAt: "2026-03-05T14:00:00.000Z" },
  { id: "b2", marketId: "m1", userId: "u2", side: "no", amount: 500, oddsAtTime: 72, createdAt: "2026-03-05T09:00:00.000Z" },
  { id: "b3", marketId: "m1", userId: "u3", side: "yes", amount: 300, oddsAtTime: 68, createdAt: "2026-03-04T18:00:00.000Z" },
  { id: "b4", marketId: "m3", userId: "u5", side: "yes", amount: 1200, oddsAtTime: 62, createdAt: "2026-03-05T16:00:00.000Z" },
  { id: "b5", marketId: "m3", userId: "u1", side: "yes", amount: 400, oddsAtTime: 64, createdAt: "2026-03-05T12:00:00.000Z" },
  { id: "b6", marketId: "m2", userId: "u4", side: "no", amount: 300, oddsAtTime: 36, createdAt: "2026-03-05T11:00:00.000Z" },
  { id: "b7", marketId: "m5", userId: "u6", side: "yes", amount: 250, oddsAtTime: 54, createdAt: "2026-03-05T10:00:00.000Z" },
  { id: "b8", marketId: "m8", userId: "u7", side: "no", amount: 600, oddsAtTime: 46, createdAt: "2026-03-04T22:00:00.000Z" },
  { id: "b9", marketId: "m4", userId: "u2", side: "yes", amount: 350, oddsAtTime: 56, createdAt: "2026-03-04T20:00:00.000Z" },
  { id: "b10", marketId: "m6", userId: "u8", side: "no", amount: 150, oddsAtTime: 44, createdAt: "2026-03-04T15:00:00.000Z" },
  { id: "b11", marketId: "m7", userId: "u1", side: "no", amount: 200, oddsAtTime: 30, createdAt: "2026-03-04T13:00:00.000Z" },
  { id: "b12", marketId: "m10", userId: "u5", side: "yes", amount: 800, oddsAtTime: 32, createdAt: "2026-03-04T10:00:00.000Z" },
  // Resolved market bets
  { id: "b13", marketId: "m16", userId: "u1", side: "yes", amount: 500, oddsAtTime: 60, createdAt: "2025-08-10T00:00:00.000Z" },
  { id: "b14", marketId: "m16", userId: "u5", side: "yes", amount: 800, oddsAtTime: 65, createdAt: "2025-09-01T00:00:00.000Z" },
  { id: "b15", marketId: "m17", userId: "u1", side: "yes", amount: 300, oddsAtTime: 55, createdAt: "2025-07-15T00:00:00.000Z" },
  { id: "b16", marketId: "m17", userId: "u2", side: "no", amount: 400, oddsAtTime: 60, createdAt: "2025-08-01T00:00:00.000Z" },
];

// ---------------------------------------------------------------------------
// Mock leaderboard
// ---------------------------------------------------------------------------

export const leaderboard: LeaderboardEntry[] = [
  { userId: "u5", xHandle: "tdinh_me", xName: "Tony Dinh", avatarUrl: "", winRate: 87, totalPredictions: 42, creditsWon: 8400, creditsLost: 1200, currentStreak: 7 },
  { userId: "u1", xHandle: "sarahbuilds", xName: "Sarah Chen", avatarUrl: "", winRate: 78, totalPredictions: 36, creditsWon: 5600, creditsLost: 1800, currentStreak: 4 },
  { userId: "u7", xHandle: "jdnoc", xName: "John Noc", avatarUrl: "", winRate: 74, totalPredictions: 31, creditsWon: 4800, creditsLost: 2100, currentStreak: 3 },
  { userId: "u3", xHandle: "marc_louvion", xName: "Marc Lou", avatarUrl: "", winRate: 71, totalPredictions: 28, creditsWon: 4200, creditsLost: 1900, currentStreak: 2 },
  { userId: "u6", xHandle: "katynkaa", xName: "Katya Sorokina", avatarUrl: "", winRate: 68, totalPredictions: 22, creditsWon: 3100, creditsLost: 1500, currentStreak: 5 },
  { userId: "u2", xHandle: "indiejan", xName: "Jan de Vries", avatarUrl: "", winRate: 62, totalPredictions: 40, creditsWon: 4000, creditsLost: 2600, currentStreak: 1 },
  { userId: "u4", xHandle: "dannypostmaa", xName: "Danny Postma", avatarUrl: "", winRate: 55, totalPredictions: 18, creditsWon: 2200, creditsLost: 1800, currentStreak: 0 },
  { userId: "u8", xHandle: "alexwest", xName: "Alex West", avatarUrl: "", winRate: 50, totalPredictions: 12, creditsWon: 1400, creditsLost: 1400, currentStreak: 2 },
];

// ---------------------------------------------------------------------------
// Mock live feed — pre-built from bets + markets + startups for the landing page.
// In production, this is a real-time stream.
// ---------------------------------------------------------------------------

export const feedItems: FeedItem[] = [
  { id: "f1", userXHandle: "sarahbuilds", side: "yes", startupName: "ShipFast", marketQuestion: "hits $20k MRR", amount: 200, createdAt: "2026-03-06T10:58:00.000Z" },
  { id: "f2", userXHandle: "tdinh_me", side: "yes", startupName: "PhotoAI", marketQuestion: "reaches $50k MRR", amount: 1200, createdAt: "2026-03-06T10:44:00.000Z" },
  { id: "f3", userXHandle: "dannypostmaa", side: "no", startupName: "ShipFast", marketQuestion: "sold in 90 days", amount: 300, createdAt: "2026-03-06T10:27:00.000Z" },
  { id: "f4", userXHandle: "katynkaa", side: "yes", startupName: "TypingMind", marketQuestion: "hits $20k MRR", amount: 250, createdAt: "2026-03-06T10:12:00.000Z" },
  { id: "f5", userXHandle: "indiejan", side: "no", startupName: "ShipFast", marketQuestion: "hits $20k MRR", amount: 500, createdAt: "2026-03-06T09:55:00.000Z" },
  { id: "f6", userXHandle: "jdnoc", side: "no", startupName: "Potion", marketQuestion: "sold in 90 days", amount: 600, createdAt: "2026-03-06T09:38:00.000Z" },
  { id: "f7", userXHandle: "sarahbuilds", side: "yes", startupName: "PhotoAI", marketQuestion: "reaches $50k MRR", amount: 400, createdAt: "2026-03-06T09:22:00.000Z" },
  { id: "f8", userXHandle: "indiejan", side: "yes", startupName: "PhotoAI", marketQuestion: "maintains 20%+ growth", amount: 350, createdAt: "2026-03-06T09:05:00.000Z" },
  { id: "f9", userXHandle: "alexwest", side: "no", startupName: "PDFPeer", marketQuestion: "hits $5k MRR", amount: 150, createdAt: "2026-03-06T08:48:00.000Z" },
  { id: "f10", userXHandle: "tdinh_me", side: "yes", startupName: "Logspot", marketQuestion: "doubles MRR in 90d", amount: 800, createdAt: "2026-03-06T08:30:00.000Z" },
];
