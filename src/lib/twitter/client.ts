const API_URL = "https://api.twitterapi.io/twitter/user/info";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 30_000; // 30s

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface TwitterUserInfo {
  id: string;
  userName: string;
  name: string;
  followers: number;
  following: number;
  isBlueVerified: boolean;
  description: string | null;
  profilePicture: string | null;
  location: string | null;
  createdAt: string | null;
  statusesCount: number;
  unavailable: boolean;
}

export async function getUserInfo(handle: string): Promise<TwitterUserInfo | null> {
  const key = process.env.TWITTER_API_KEY;
  if (!key) throw new Error("TWITTER_API_KEY is not set");

  const url = `${API_URL}?userName=${encodeURIComponent(handle)}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: { "X-API-Key": key },
    });

    if (res.status === 429) {
      if (attempt === MAX_RETRIES) {
        console.error(`[twitter] 429 for @${handle} after ${MAX_RETRIES} retries, giving up`);
        return null;
      }
      const wait = INITIAL_BACKOFF * Math.pow(2, attempt);
      console.log(`[twitter] 429 — waiting ${Math.round(wait / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(wait);
      continue;
    }

    if (!res.ok) {
      console.error(`[twitter] ${res.status} for @${handle}`);
      return null;
    }

    const json = await res.json();
    const d = json.data;
    if (!d) return null;

    if (d.unavailable) {
      console.log(`[twitter] @${handle} is unavailable (suspended/deactivated)`);
      return null;
    }

    return {
      id: d.id,
      userName: d.userName,
      name: d.name,
      followers: d.followers,
      following: d.following,
      isBlueVerified: d.isBlueVerified ?? false,
      description: d.description ?? null,
      profilePicture: d.profilePicture ?? null,
      location: d.location ?? null,
      createdAt: d.createdAt ?? null,
      statusesCount: d.statusesCount ?? 0,
      unavailable: false,
    };
  }

  return null;
}

