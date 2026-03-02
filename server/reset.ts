
import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

async function reset() {
    console.log("🗑️  Emptying database...");
    await db.execute(sql`DROP SCHEMA public CASCADE;`);
    await db.execute(sql`CREATE SCHEMA public;`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO postgres;`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO public;`);
    console.log("✅ Database emptied");
    process.exit(0);
}

reset().catch((err) => {
    console.error(err);
    process.exit(1);
});
