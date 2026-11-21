
import "dotenv/config";
import { db } from "../server/db";
import { invoices, clinicSettings } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function syncInvoiceNumbers() {
  const allInvoices = await db.select({ invoiceNumber: invoices.invoiceNumber }).from(invoices);
  
  let maxNum = 0;
  for (const inv of allInvoices) {
    if (inv.invoiceNumber && inv.invoiceNumber.startsWith("#PET-")) {
      const numPart = inv.invoiceNumber.substring(5);
      const num = parseInt(numPart);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  console.log("Calculated Max Number:", maxNum);
  console.log("Setting next_invoice_number to:", nextNum);

  await db
    .insert(clinicSettings)
    .values({ settingKey: "next_invoice_number", settingValue: String(nextNum) })
    .onConflictDoUpdate({
      target: clinicSettings.settingKey,
      set: { settingValue: String(nextNum) },
    });

  console.log("Sync complete.");
  process.exit(0);
}

syncInvoiceNumbers().catch(console.error);
