import { createAdminClient } from "@/lib/supabase/admin";
import { getUserInfo, type TwitterUserInfo } from "./client";

type Admin = ReturnType<typeof createAdminClient>;

/** Upsert a TwitterUserInfo into the twitter_profiles table */
export async function upsertTwitterProfile(admin: Admin, handle: string, info: TwitterUserInfo) {
  const now = new Date().toISOString();
  const { error } = await admin.from("twitter_profiles").upsert(
    {
      x_handle: handle,
      twitter_id: info.id,
      display_name: info.name,
      description: info.description,
      profile_picture: info.profilePicture,
      location: info.location,
      followers: info.followers,
      following: info.following,
      statuses_count: info.statusesCount,
      is_blue_verified: info.isBlueVerified,
      unavailable: info.unavailable,
      created_at_twitter: info.createdAt,
      synced_at: now,
      updated_at: now,
    },
    { onConflict: "x_handle" }
  );
  if (error) console.error(`[twitter] upsert profile @${handle}: ${error.message}`);
}

/** Update startups.x_follower_count for all startups matching this handle */
async function updateStartupFollowers(admin: Admin, handle: string, followers: number) {
  await admin
    .from("startups")
    .update({ x_follower_count: followers })
    .eq("x_handle", handle);
}

export interface SyncFollowersResult {
  updated: number;
  skipped: number;
  total: number;
}

/**
 * Fetch and store Twitter profiles for all founder handles.
 * Stops early after 5 consecutive failures (rate limit protection).
 * Returns counts for logging.
 */
export async function syncAllFollowers(
  admin: Admin,
  onProgress?: (handle: string, followers: number) => void
): Promise<SyncFollowersResult> {
  const { data: rows } = await admin
    .from("startups")
    .select("x_handle")
    .not("x_handle", "is", null);

  const handles = [...new Set((rows ?? []).map((r) => r.x_handle as string))];
  let updated = 0;
  let skipped = 0;
  let consecutiveFailures = 0;

  for (const handle of handles) {
    const info = await getUserInfo(handle);

    if (!info) {
      skipped++;
      consecutiveFailures++;
      if (consecutiveFailures >= 5) {
        console.log(`[twitter] 5 consecutive failures — stopping early`);
        break;
      }
      continue;
    }

    consecutiveFailures = 0;
    await upsertTwitterProfile(admin, handle, info);
    await updateStartupFollowers(admin, handle, info.followers);
    onProgress?.(handle, info.followers);
    updated++;
  }

  return { updated, skipped, total: handles.length };
}
