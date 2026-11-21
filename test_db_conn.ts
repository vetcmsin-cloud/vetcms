import 'dotenv/config';
import { db } from "./server/db";
import { users } from "./shared/schema";

async function testDB() {
  console.log("Connecting to:", process.env.DATABASE_URL);
  try {
    const list = await db.select().from(users).limit(1);
    console.log("DB SUCCESS, user exists:", list.length > 0);
  } catch (err) {
    console.error("DB FAILED:", err);
  } finally {
    process.exit(0);
  }
}

testDB();
