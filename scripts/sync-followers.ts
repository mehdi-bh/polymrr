import { createAdminClient } from "@/lib/supabase/admin";
import { syncAllFollowers } from "@/lib/twitter/sync";

async function main() {
  const admin = createAdminClient();

  const result = await syncAllFollowers(admin, (handle, followers) => {
    console.log(`  OK @${handle} → ${followers.toLocaleString()}`);
  });

  console.log(`\nDone: ${result.updated} updated, ${result.skipped} skipped out of ${result.total}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
