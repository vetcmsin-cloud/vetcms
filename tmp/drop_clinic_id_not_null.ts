import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`
      ALTER TABLE expenses 
      ALTER COLUMN clinic_id DROP NOT NULL;
    `);
    console.log("Migration complete: Dropped NOT NULL from clinic_id in expenses");
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
