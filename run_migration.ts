import 'dotenv/config';
import pg from 'pg';

async function migrate() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log("Checking inventory_items...");
    const resInv = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory_items'");
    const colsInv = resInv.rows.map(r => r.column_name);
    
    const missingInv = ["purchase_sgst_amount", "purchase_cgst_amount", "sale_sgst_amount", "sale_cgst_amount"];
    for (const col of missingInv) {
      if (!colsInv.includes(col)) {
        console.log(`Adding ${col} to inventory_items...`);
        await pool.query(`ALTER TABLE inventory_items ADD COLUMN ${col} DECIMAL(10,2) DEFAULT 0`);
      }
    }

    console.log("Checking purchase_order_items...");
    const resPoi = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_order_items'");
    const colsPoi = resPoi.rows.map(r => r.column_name);
    const missingPoi = ["sgst_amount", "cgst_amount"];
    for (const col of missingPoi) {
      if (!colsPoi.includes(col)) {
        console.log(`Adding ${col} to purchase_order_items...`);
        await pool.query(`ALTER TABLE purchase_order_items ADD COLUMN ${col} DECIMAL(10,2) DEFAULT 0`);
      }
    }

    console.log("Checking purchase_items...");
    const resPi = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_items'");
    const colsPi = resPi.rows.map(r => r.column_name);
    const missingPi = ["sgst_amount", "cgst_amount"];
    for (const col of missingPi) {
      if (!colsPi.includes(col)) {
        console.log(`Adding ${col} to purchase_items...`);
        await pool.query(`ALTER TABLE purchase_items ADD COLUMN ${col} DECIMAL(10,2) DEFAULT 0`);
      }
    }
    
    console.log("Full Migration complete!");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    await pool.end();
  }
}

migrate();
