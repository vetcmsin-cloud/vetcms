import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const res = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'expenses';
    `);
    console.log(res.rows);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
