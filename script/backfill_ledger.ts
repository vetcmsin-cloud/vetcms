import { db } from "../server/db";
import { invoices, purchaseOrders, expenses, owners, suppliers } from "../shared/schema";
import { storage } from "../server/storage";
import { eq, isNotNull } from "drizzle-orm";

async function backfillLedger() {
  console.log("Starting ledger backfill...");

  let addedSales = 0;
  let addedPurchases = 0;
  let addedExpenses = 0;

  try {
    // 1. Paid Invoices (Sales)
    console.log("Processing Invoices...");
    const allInvoices = await db.select().from(invoices).where(eq(invoices.status, "paid"));
    
    for (const inv of allInvoices) {
      const existing = await storage.getLedgerEntryByReference("invoice", inv.id);
      if (!existing) {
        let partyName = "Unknown";
        if (inv.ownerId) {
          const ownerMatch = await db.select().from(owners).where(eq(owners.id, inv.ownerId));
          if (ownerMatch.length > 0) {
             const o = ownerMatch[0];
             partyName = `${o.firstName} ${o.lastName || ''}`.trim();
          }
        } else {
          partyName = "Walk-in OP";
        }
        
        await storage.createLedgerEntry({
          date: inv.date || new Date().toISOString().split("T")[0],
          voucherNumber: await storage.getNextVoucherNumber("sale"),
          type: "sale",
          category: "Sales Revenue",
          description: `Payment received for Invoice ${inv.invoiceNumber}`,
          party: partyName,
          referenceType: "invoice",
          referenceId: inv.id,
          referenceNumber: inv.invoiceNumber || undefined,
          debitAmount: String(inv.total),
          creditAmount: "0",
          paymentMethod: inv.paymentMethod || "cash",
          createdBy: inv.billedBy || inv.createdBy,
        });
        addedSales++;
      }
    }

    // 2. Received Purchase Orders
    console.log("Processing POs...");
    const allPos = await db.select().from(purchaseOrders).where(isNotNull(purchaseOrders.receivedDate));
    
    for (const po of allPos) {
      const existing = await storage.getLedgerEntryByReference("purchase_order", po.id);
      if (!existing) {
        let supplierName = "Unknown Supplier";
        if (po.supplierId) {
          const suppMatch = await db.select().from(suppliers).where(eq(suppliers.id, po.supplierId));
          if (suppMatch.length > 0) {
            supplierName = suppMatch[0].name;
          }
        }
        
        await storage.createLedgerEntry({
          date: po.receivedDate || new Date().toISOString().split("T")[0],
          voucherNumber: await storage.getNextVoucherNumber("purchase"),
          type: "purchase",
          category: "Inventory Purchase",
          description: `Payment for Purchase Order ${po.orderNumber}`,
          party: supplierName,
          referenceType: "purchase_order",
          referenceId: po.id,
          referenceNumber: po.orderNumber,
          debitAmount: "0",
          creditAmount: String(po.totalAmount),
          paymentMethod: "bank",
          createdBy: null,
        });
        addedPurchases++;
      }
    }

    // 3. Expenses
    console.log("Processing Expenses...");
    const allExpenses = await db.select().from(expenses);
    for (const exp of allExpenses) {
      const existing = await storage.getLedgerEntryByReference("expense", exp.id);
      if (!existing) {
        await storage.createLedgerEntry({
          date: exp.date,
          voucherNumber: await storage.getNextVoucherNumber("expense"),
          type: "expense",
          category: exp.category,
          description: exp.description,
          party: "Expense",
          referenceType: "expense",
          referenceId: exp.id,
          referenceNumber: undefined,
          debitAmount: "0",
          creditAmount: String(exp.amount),
          paymentMethod: exp.paymentMethod || "cash",
          createdBy: null,
        });
        addedExpenses++;
      }
    }

    console.log(`Backfill complete. Added ${addedSales} sales, ${addedPurchases} purchases, ${addedExpenses} expenses to the ledger.`);
  } catch (err: any) {
    console.error("Backfill failed:", err);
  } finally {
    process.exit(0);
  }
}

backfillLedger();
