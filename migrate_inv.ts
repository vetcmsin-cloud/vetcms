import "dotenv/config";
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function runMigration() {
  try {
    console.log("Checking for product_type and mrp columns in inventory_items...");
    await db.execute(sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'Medicine'`);
    await db.execute(sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS mrp decimal(10, 2) DEFAULT '0'`);
    console.log("Migration successful!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
