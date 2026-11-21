import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`
      ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2),
      ADD COLUMN IF NOT EXISTS vendor_id INTEGER,
      ADD COLUMN IF NOT EXISTS invoice_number TEXT,
      ADD COLUMN IF NOT EXISTS attachment_url TEXT,
      ADD COLUMN IF NOT EXISTS paid_by_id INTEGER;
    `);
    console.log("Migration complete");
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
