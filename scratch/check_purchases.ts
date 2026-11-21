import { db } from "../server/db";
import { purchases, purchaseItems } from "../shared/schema";

async function main() {
  const allP = await db.select().from(purchases);
  const allI = await db.select().from(purchaseItems);
  
  console.log("Purchases:", allP.map(p => ({ id: p.id, number: p.purchaseNumber, supplierId: p.supplierId })));
  console.log("Items:");
  for (const i of allI) {
    console.log(`Purchase ID: ${i.purchaseId}, Inv: ${i.inventoryItemId}, Qty: ${i.quantity}`);
  }
  process.exit(0);
}

main().catch(console.error);
