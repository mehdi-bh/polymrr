import { createAdminClient } from "@/lib/supabase/admin";
import { getFollowerCount } from "@/lib/twitter/client";

async function main() {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("startups")
    .select("x_handle")
    .not("x_handle", "is", null);

  if (error) throw new Error(`Failed to fetch handles: ${error.message}`);

  const handles = [...new Set((rows ?? []).map((r) => r.x_handle as string))];
  console.log(`Found ${handles.length} unique handles`);

  let updated = 0;
  let failed = 0;

  for (const handle of handles) {
    const count = await getFollowerCount(handle);
    if (count === null) {
      console.log(`  SKIP @${handle} — no data`);
      failed++;
      continue;
    }

    const { error: updateErr } = await admin
      .from("startups")
      .update({ x_follower_count: count })
      .eq("x_handle", handle);

    if (updateErr) {
      console.log(`  FAIL @${handle}: ${updateErr.message}`);
      failed++;
    } else {
      console.log(`  OK @${handle} → ${count}`);
      updated++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
