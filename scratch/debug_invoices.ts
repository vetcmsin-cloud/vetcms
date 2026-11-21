import "dotenv/config";

import { db } from "../server/db";
import { invoices, clinicSettings } from "../shared/schema";
import { eq, sql, desc } from "drizzle-orm";

async function checkSequences() {
  const sequences = [
    { key: "next_invoice_number", table: "invoices", prefix: "#PET-" },
    { key: "next_estimate_number", table: "estimates", prefix: "EST-" },
    { key: "next_po_number", table: "purchase_orders", prefix: "PO-" },
    { key: "next_purchase_number", table: "purchases", prefix: "PUR-" },
  ];

  for (const seq of sequences) {
    const [setting] = await db.select().from(clinicSettings).where(eq(clinicSettings.settingKey, seq.key));
    console.log(`Setting '${seq.key}':`, setting?.settingValue);

    // Get max from DB
    const tableName = seq.table as "invoices" | "estimates" | "purchaseOrders" | "purchases";
    const tableObj = (await import("../shared/schema"))[tableName];
    
    // This is a bit dynamic for drizzle, let's just use raw SQL for speed or simple query
    const results = await db.select().from(tableObj);
    let max = 0;
    results.forEach((r: any) => {
       const val = r.invoiceNumber || r.estimateNumber || r.orderNumber || r.purchaseNumber;
       if (val && val.startsWith(seq.prefix)) {
         const num = parseInt(val.substring(seq.prefix.length));
         if (!isNaN(num) && num > max) max = num;
       }
    });
    console.log(`Max in ${seq.table}:`, max);
    console.log("---");
  }
}

checkSequences().catch(console.error);
