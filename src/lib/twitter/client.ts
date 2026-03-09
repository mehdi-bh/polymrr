const API_URL = "https://api.twitterapi.io/twitter/user/info";

export async function getFollowerCount(handle: string): Promise<number | null> {
  const key = process.env.TWITTER_API_KEY;
  if (!key) throw new Error("TWITTER_API_KEY is not set");

  const url = `${API_URL}?userName=${encodeURIComponent(handle)}`;
  const res = await fetch(url, {
    headers: { "X-API-Key": key },
  });

  if (!res.ok) {
    console.error(`[twitter] ${res.status} for @${handle}`);
    return null;
  }

  const json = await res.json();
  return json.data?.followers ?? null;
}
