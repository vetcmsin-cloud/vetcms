import "dotenv/config";
import { db } from "./server/db";
import { inventoryItems } from "./shared/schema";

async function checkInventory() {
  const all = await db.select().from(inventoryItems);
  console.log(`TOTAL ITEMS IN DATABASE: ${all.length}`);
  if (all.length > 0) {
    console.log("LAST 3 ITEMS:");
    console.log(JSON.stringify(all.slice(-3), null, 2));
  }
}

checkInventory().then(() => process.exit(0));
