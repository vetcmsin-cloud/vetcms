import 'dotenv/config';
import pg from 'pg';

async function checkColumns() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'");
    console.log("Columns in invoices:");
    console.log(res.rows.map(r => r.column_name).join(", "));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

checkColumns();
