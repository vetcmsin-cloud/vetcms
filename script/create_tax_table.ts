import 'dotenv/config';
import pg from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not defined");
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: connectionString,
  });

  const client = await pool.connect();
  try {
    console.log("Creating tax_categories table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS tax_categories (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name TEXT NOT NULL,
        purchase_sgst DECIMAL(5,2) NOT NULL DEFAULT 0,
        sales_sgst DECIMAL(5,2) NOT NULL DEFAULT 0,
        purchase_cgst DECIMAL(5,2) NOT NULL DEFAULT 0,
        sales_cgst DECIMAL(5,2) NOT NULL DEFAULT 0,
        purchase_igst DECIMAL(5,2) NOT NULL DEFAULT 0,
        sales_igst DECIMAL(5,2) NOT NULL DEFAULT 0
      );
    `);
    console.log("Table created successfully.");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
