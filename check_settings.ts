
import { db } from "./server/db";
import { clinicSettings } from "./shared/schema";

async function main() {
  const allSettings = await db.select().from(clinicSettings);
  console.log(JSON.stringify(allSettings, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
