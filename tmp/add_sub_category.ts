import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`
      ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS sub_category TEXT;
    `);
    console.log("Migration complete: added sub_category");
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
