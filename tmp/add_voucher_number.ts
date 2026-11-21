import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`
      ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS voucher_number TEXT;
    `);
    console.log("Migration complete: Added voucher_number to expenses");
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
