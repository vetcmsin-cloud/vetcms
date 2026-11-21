import 'dotenv/config';
import pg from 'pg';

async function migrate() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("Starting migration...");
    
    await pool.query(`
      ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS sgst_rate decimal(5,2) DEFAULT 0;
      ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS cgst_rate decimal(5,2) DEFAULT 0;
      ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS unit text DEFAULT 'Unit';

      ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS sgst_rate decimal(5,2) DEFAULT 0;
      ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS cgst_rate decimal(5,2) DEFAULT 0;
      ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS unit text DEFAULT 'Unit';
    `);
    
    console.log("Migration completed successfully.");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    await pool.end();
  }
}

migrate();
