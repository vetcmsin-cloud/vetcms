import "dotenv/config";
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function applyIndexes() {
  console.log("Applying database indexes for performance...");
  try {
    // Indexes for fast dashboard summary
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pets_owner ON pets (owner_id);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments (date);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);`);
    
    // Indexes for other common lookups
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices (date);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_invoices_owner ON invoices (owner_id);`);
    
    console.log("✅ Indexes applied successfully! Database queries should now be instant.");
  } catch (error) {
    console.error("❌ Failed to apply indexes:", error);
  }
  process.exit(0);
}

applyIndexes();
