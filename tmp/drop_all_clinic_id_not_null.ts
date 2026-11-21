import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const res = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'clinic_id' 
      AND is_nullable = 'NO'
      AND table_schema = 'public';
    `);
    
    for (const row of res.rows) {
      const tableName = row.table_name;
      console.log(`Dropping NOT NULL constraint for clinic_id in table: ${tableName}`);
      await db.execute(sql.raw(`ALTER TABLE ${tableName} ALTER COLUMN clinic_id DROP NOT NULL;`));
    }
    console.log("Migration complete: Dropped all NOT NULL constraints on clinic_id");
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
