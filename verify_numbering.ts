
import "dotenv/config";
import { storage } from "./server/storage";
import { db } from "./server/db";
import { clinicSettings, invoices } from "./shared/schema";
import { eq } from "drizzle-orm";

async function verify() {
  console.log("--- Starting Verification ---");

  // 1. Initial State
  const initialNext = await storage.getNextInvoiceNumber();
  console.log(`Initial Next Invoice Number: ${initialNext}`);

  // 2. Set custom next number
  console.log("Setting next_invoice_number to 5000...");
  await storage.upsertClinicSetting("next_invoice_number", "5000");
  
  const updatedNext = await storage.getNextInvoiceNumber();
  console.log(`Updated Next Invoice Number (Preview): ${updatedNext}`);

  if (updatedNext !== "#PET-5000") {
    console.error("FAILED: Preview number did not update correctly.");
    process.exit(1);
  }

  // 3. Create a test invoice
  console.log("Creating test invoice...");
  const testInvoice = await storage.createInvoice({
    date: new Date().toISOString().split('T')[0],
    ownerId: 0,
    status: "pending",
    invoiceNumber: "#TEMP-TEST",
    subtotal: "0",
    tax: "0",
    discount: "0",
    total: "0",
    invoiceType: "op"
  } as any);

  console.log(`Created Invoice Number: ${testInvoice.invoiceNumber}`);

  if (testInvoice.invoiceNumber !== "#PET-5000") {
    console.error(`FAILED: Created invoice number was ${testInvoice.invoiceNumber}, expected #PET-5000.`);
    process.exit(1);
  }

  // 4. Check increment
  const afterNext = await storage.getNextInvoiceNumber();
  console.log(`Next Invoice Number after creation: ${afterNext}`);

  if (afterNext !== "#PET-5001") {
    console.error(`FAILED: Next number did not increment correctly. Expected #PET-5001, got ${afterNext}.`);
    process.exit(1);
  }

  // Cleanup
  console.log("Cleaning up test data...");
  await db.delete(invoices).where(eq(invoices.id, testInvoice.id));
  
  console.log("--- Verification SUCCESS ---");
  process.exit(0);
}

verify().catch(err => {
  console.error("Verification ERROR:", err);
  process.exit(1);
});
