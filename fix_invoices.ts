import "dotenv/config";
import { db } from "./server/db";
import { invoices } from "@shared/schema";
import { asc, eq } from "drizzle-orm";

async function fixInvoices() {
  console.log("Fetching invoices...");
  const allInvoices = await db.query.invoices.findMany({
    orderBy: [asc(invoices.id)]
  });

  console.log(`Found ${allInvoices.length} invoices. Renumbering sequentially...`);

  // Step 1: Assign temp prefix to ALL invoices to bypass unique constraints
  for (const inv of allInvoices) {
    await db.update(invoices)
      .set({ invoiceNumber: `TEMP_RENUMBER_${inv.id}` })
      .where(eq(invoices.id, inv.id));
  }
  
  console.log("Temporary pass complete. Assigning final sequence...");

  let counter = 1;
  let updatedCount = 0;

  for (const inv of allInvoices) {
    const newNumber = `#PET-${String(counter).padStart(4, "0")}`;
    await db.update(invoices)
      .set({ invoiceNumber: newNumber })
      .where(eq(invoices.id, inv.id));
    console.log(`Assigned: ${newNumber} to Invoice ID ${inv.id}`);
    updatedCount++;
    counter++;
  }
  
  console.log(`Done. Updated ${updatedCount} invoices. New highest is #PET-${String(counter - 1).padStart(4, "0")}`);
  process.exit(0);
}

fixInvoices().catch((e) => {
  console.error(e);
  process.exit(1);
});
