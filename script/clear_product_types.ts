import 'dotenv/config';
import { db } from "../server/db";
import { inventoryProductTypes } from "../shared/schema";
import { sql } from "drizzle-orm";

async function clear() {
  console.log("Clearing inventory product types...");
  await db.delete(inventoryProductTypes);
  await db.execute(sql`ALTER SEQUENCE inventory_product_types_id_seq RESTART WITH 1`);
  console.log("Done.");
  process.exit(0);
}

clear().catch(console.error);
