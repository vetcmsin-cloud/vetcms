import "dotenv/config";
import { db } from "./server/db";
import { inventoryItems, inventoryCategories, inventoryUnits, suppliers as supplierTable } from "./shared/schema";
import { eq, ilike } from "drizzle-orm";

async function testImport() {
  const row = {
    "Item Code": "TEST0000001",
    "Name": "Test Item",
    "Category": "Medicine",
    "Base Unit": "Bottle",
    "Quantity": 10,
    "Min Quantity": 5,
    "Purchase Price": "100.00",
    "Sale Price": "150.00",
    "MRP": "160.00",
    "Batch": "B1",
    "Expiry": "2025-01-01",
    "Description": "Test Desc",
    "Product Type": "Medicine"
  };

  try {
    const sku = String(row["Item Code"] || "").trim();
    const categoryName = String(row.Category || "General").trim();
    const unitName = String(row["Base Unit"] || "Unit").trim();
    
    const inventoryData = {
      sku,
      name: String(row.Name || "Unnamed Item").trim(),
      category: categoryName,
      baseUnit: unitName,
      subCategory: "",
      quantity: Number(row.Quantity || 0),
      minQuantity: Number(row["Min Quantity"] || 0),
      mrp: String(row.MRP || "0"),
      purchasePrice: String(row["Purchase Price"] || "0"),
      salePrice: String(row["Sale Price"] || "0"),
      supplierId: null,
      batchNumber: String(row.Batch || "").trim(),
      expiryDate: String(row.Expiry || "").trim(),
      description: String(row.Description || "").trim(),
      productType: String(row["Product Type"] || "Medicine").trim(),
      lastUpdated: new Date().toISOString(),
    };

    console.log("Simulating import for SKU:", sku);
    console.log("Data to insert:", JSON.stringify(inventoryData, null, 2));

    const [existing] = await db.select().from(inventoryItems).where(eq(inventoryItems.sku, sku));
    if (existing) {
      console.log("Item exists, updating...");
      await db.update(inventoryItems).set(inventoryData).where(eq(inventoryItems.id, existing.id));
      console.log("Update successful!");
    } else {
      console.log("Item does not exist, creating...");
      const [created] = await db.insert(inventoryItems).values(inventoryData).returning();
      console.log("Create successful! ID:", created.id);
    }
  } catch (err) {
    console.error("IMPORT ERROR:", err);
  } finally {
    process.exit(0);
  }
}

testImport();
