import express from "express";
import { storage } from "../storage";
import { db } from "../db";
import { inventoryItems } from "@shared/schema";
import { sql as sqlTag } from "drizzle-orm";
import { requireAuth, requirePermission } from "../auth";
import { insertInventoryItemSchema } from "@shared/schema";
import * as XLSX from "xlsx";
import multer from "multer";

const memoryUpload = multer({ storage: multer.memoryStorage() });

// --- Activity Log Helper (Local Copy or Injection) ---
async function logActivity(req: express.Request, action: string, entityType: string, entityId?: number, details?: string) {
  try {
    const userId = (req.session as any)?.userId || null;
    const user = userId ? await storage.getUser(userId) : null;
    await storage.createActivityLog({
      userId,
      userName: user?.name || "System",
      action,
      entityType,
      entityId: entityId ?? null,
      details: details || null,
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch (e) {
    console.error("Activity log error:", e);
  }
}

export async function resolveBatchName(name: string, mrp: string, salePrice: string, purchasePrice: string, batchCriteria?: string) {
  const allItems = await storage.getInventoryItemsByBaseName(name);
  
  // Filter to exact name matches or "Name bX" matches
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const batchRegex = new RegExp(`^${escapedName}(?: b(\\d+))?$`, 'i');
  const existingBatches = allItems.filter(item => batchRegex.test(item.name));
  
  if (existingBatches.length === 0) return { name, isDuplicate: false };

  // Determine duplicate status based on Batch Criteria
  let priceMatch: any = null;
  
  if (batchCriteria === "On MRP Change") {
    priceMatch = existingBatches.find(item => Number(item.mrp) === Number(mrp));
  } else if (batchCriteria === "Sales Price/MRP Change") {
    priceMatch = existingBatches.find(item => Number(item.mrp) === Number(mrp) && Number(item.salePrice) === Number(salePrice));
  } else if (batchCriteria === "On Purchase Price Change") {
    priceMatch = existingBatches.find(item => Number(item.purchasePrice) === Number(purchasePrice));
  } else {
    // Default: Check all three
    priceMatch = existingBatches.find(item => 
      Number(item.mrp) === Number(mrp) &&
      Number(item.salePrice) === Number(salePrice) &&
      Number(item.purchasePrice) === Number(purchasePrice)
    );
  }

  if (priceMatch) {
    return { name: priceMatch.name, isDuplicate: true, existingId: priceMatch.id };
  }

  // Find the next batch number
  let maxBatch = 0;
  for (const item of existingBatches) {
    const match = item.name.match(batchRegex);
    if (match && match[1]) {
      maxBatch = Math.max(maxBatch, parseInt(match[1]));
    }
  }

  return { name: `${name} b${maxBatch + 1}`, isDuplicate: false };
}

export function registerInventoryRoutes(app: express.Express) {
  // --- Inventory Routes ---
  app.get("/api/inventory", requireAuth, requirePermission("inventory.view", "billing.view", "billing.create", "billing.manage", "billing.edit", "billing.delete"), async (_req, res) => {
    const items = await storage.getInventoryItems();
    res.json(items);
  });

  app.post("/api/inventory", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    try {
      const result = insertInventoryItemSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid item data", 
          errors: result.error.errors 
        });
      }
      
      const data = { 
        ...result.data,
        lastUpdated: new Date().toISOString()
      };
      
      // Ensure ID is not present to avoid identity column errors
      delete (data as any).id;
      
      // Check for SKU uniqueness
      if (data.sku) {
        const existingBySku = await storage.getInventoryItemBySku(data.sku);
        if (existingBySku) {
          return res.status(400).json({ 
            message: `Item Code "${data.sku}" is already in use by another product.` 
          });
        }
      }

      // Batch resolution logic
      const resolution = await resolveBatchName(data.name, String(data.mrp), String(data.salePrice), String(data.purchasePrice), data.batchCriteria || undefined);
      if (resolution.isDuplicate) {
        return res.status(400).json({ 
          message: `Product "${data.name}" already exists with exact same prices as batch "${resolution.name}".` 
        });
      }
      
      data.name = resolution.name;
      const item = await storage.createInventoryItem(data);
      
      // Ensure logging is awaited to catch potential errors
      await logActivity(req, "CREATE", "Inventory", item.id, `Added inventory item "${item.name}"`);

      // Auto-extract units
      try {
        const existingUnits = await storage.getInventoryUnits();
        const unitSet = new Set(existingUnits.map(u => u.name.toLowerCase()));
        const unitsToAdd = new Set<string>();

        if (data.baseUnit && !unitSet.has(data.baseUnit.toLowerCase())) {
          unitsToAdd.add(data.baseUnit);
          unitSet.add(data.baseUnit.toLowerCase());
        }
        if (data.multiUnit && Array.isArray(data.multiUnit)) {
          for (const mu of data.multiUnit) {
            if (mu.name && !unitSet.has(mu.name.toLowerCase())) {
              unitsToAdd.add(mu.name);
              unitSet.add(mu.name.toLowerCase());
            }
          }
        }
        for (const unitName of unitsToAdd) {
          await storage.createInventoryUnit({ name: unitName });
        }
      } catch (e: any) {
        console.error("Error auto-creating inventory units:", e);
      }

      return res.status(201).json(item);
    } catch (err: any) {
      console.error("Critical error in POST /api/inventory:", err);
      return res.status(500).json({ message: err.message || "Failed to create inventory item" });
    }
  });

  app.patch("/api/inventory/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const result = insertInventoryItemSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid item data", 
          errors: result.error.errors 
        });
      }
      const data = {
        ...result.data,
        lastUpdated: new Date().toISOString()
      };
      
      // Prevent modifying the Item Code
      const existing = await storage.getInventoryItem(id);
      if (!existing) {
        return res.status(404).json({ message: "Item not found" });
      }
      if (data.sku && data.sku !== existing.sku) {
        return res.status(400).json({ message: "Item Code cannot be modified after creation." });
      }

      const updated = await storage.updateInventoryItem(id, data);
      await logActivity(req, "UPDATE", "Inventory", id, `Updated inventory item "${updated?.name}"`);

      // Auto-extract units
      try {
        const existingUnits = await storage.getInventoryUnits();
        const unitSet = new Set(existingUnits.map(u => u.name.toLowerCase()));
        const unitsToAdd = new Set<string>();
        
        if (data.baseUnit && !unitSet.has(data.baseUnit.toLowerCase())) {
          unitsToAdd.add(data.baseUnit);
          unitSet.add(data.baseUnit.toLowerCase());
        }
        if (data.multiUnit && Array.isArray(data.multiUnit)) {
          for (const mu of data.multiUnit) {
            if (mu.name && !unitSet.has(mu.name.toLowerCase())) {
              unitsToAdd.add(mu.name);
              unitSet.add(mu.name.toLowerCase());
            }
          }
        }
        for (const unitName of unitsToAdd) {
          await storage.createInventoryUnit({ name: unitName });
        }
      } catch (e: any) {
        console.error("Error auto-creating inventory units:", e);
      }

      return res.json(updated);
    } catch (err: any) {
      console.error("Critical error in PATCH /api/inventory/:id:", err);
      return res.status(500).json({ message: err.message || "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    logActivity(req, "DELETE", "Inventory", id, "Deleted inventory item");
    await storage.deleteInventoryItem(id);
    res.sendStatus(204);
  });

  // --- Low Stock ---
  app.get("/api/inventory/low-stock", requireAuth, async (_req, res) => {
    const items = await storage.getLowStockItems();
    res.json(items);
  });

  app.get("/api/inventory/next-code/:category", requireAuth, async (req, res) => {
    try {
      const { category } = req.params;
      const nextCode = await storage.getNextItemCode(String(category));
      res.json({ nextCode });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // --- Inventory Excel Export ---
  app.get("/api/inventory/export", requireAuth, requirePermission("inventory.view"), async (_req, res) => {
    try {
      const [items, categories, units, suppliers] = await Promise.all([
        storage.getInventoryItems(),
        storage.getInventoryCategories(),
        storage.getInventoryUnits(),
        storage.getSuppliers(),
      ]);

      const data = items.map((item) => ({
        "Item Code": item.sku,
        Name: item.name,
        "Product Type": (item as any).productType || "Medicine",
        Category: item.category || "General",
        "Sub Category": item.subCategory || "",
        Quantity: item.quantity,
        "Min Quantity": item.minQuantity,
        "Purchase Price": item.purchasePrice,
        "Sale Price": item.salePrice,
        MRP: item.mrp,
        "Base Unit": item.baseUnit || "Unit",
        Supplier: item.supplier || "",
        Batch: item.batchNumber || "",
        Expiry: item.expiryDate || "",
        "MFG Date": item.mfgDate || "",
        "Min. Selling Price": item.minSellingPrice || "0",
        "GST Category ID": item.taxCategoryId || "",
        "Batch Criteria": item.batchCriteria || "",
        "Shelf Details": item.shelfDetails || "",
        Description: item.description || "",
      }));

      const wb = XLSX.utils.book_new();
      const headers = [
        "Item Code", "Name", "Product Type", "Category", "Sub Category", 
        "Quantity", "Min Quantity", "Purchase Price", "Sale Price", "MRP", 
        "Min. Selling Price", "Base Unit", "Supplier", "Batch", "Expiry", 
        "MFG Date", "GST Category ID", "Batch Criteria", "Shelf Details", "Description"
      ];
      const ws = XLSX.utils.json_to_sheet(data, { header: headers });
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", 'attachment; filename="inventory_export.xlsx"');
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      // res.set("ETag", false);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: `Export failed: ${error.message}` });
    }
  });

  // --- Inventory Excel Import ---
  app.post("/api/inventory/import", requireAuth, requirePermission("inventory.manage"), memoryUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(sheet);
      console.log(`IMPORT: Parsing ${rows.length} rows from sheet ${sheetName}`);
      
      const results = { imported: 0, updated: 0, errors: [] as string[] };

      // Pre-fetch all categories, types, units to auto-create missing ones
      const existingCats = await storage.getInventoryCategories();
      const existingSubs = await storage.getInventorySubCategories();
      const existingTypes = await storage.getInventoryProductTypes();
      const existingUnits = await storage.getInventoryUnits();

      const catSet = new Set(existingCats.map(c => c.name.toLowerCase()));
      const subSet = new Set(existingSubs.map(s => s.name.toLowerCase()));
      const typeSet = new Set(existingTypes.map(t => t.name.toLowerCase()));
      const unitSet = new Set(existingUnits.map(u => u.name.toLowerCase()));

      for (const row of rows) {
        try {
          // Robust key finding for Item Code / SKU
          const rowKeys = Object.keys(row);
          const skuKey = rowKeys.find(k => {
            const normalized = k.trim().toLowerCase().replace(/\s+/g, '');
            return normalized === 'itemcode' || normalized === 'sku';
          });
          
          const categoryName = String(row.Category || "General").trim();
          if (categoryName && !catSet.has(categoryName.toLowerCase())) {
            try {
              await storage.createInventoryCategory({ name: categoryName });
              catSet.add(categoryName.toLowerCase());
            } catch (e: any) { console.error("Error creating category:", e.message); }
          }

          const subCategoryName = String(row["Sub Category"] || "").trim();
          if (subCategoryName && !subSet.has(subCategoryName.toLowerCase())) {
            try {
              const catDef = await storage.getInventoryCategoryByName(categoryName);
              await storage.createInventorySubCategory({ name: subCategoryName, category: categoryName, categoryId: catDef?.id });
              subSet.add(subCategoryName.toLowerCase());
            } catch (e: any) { console.error("Error creating sub-category:", e.message); }
          }

          const unitName = String(row["Base Unit"] || "Unit").trim();
          if (unitName && !unitSet.has(unitName.toLowerCase())) {
            try {
              await storage.createInventoryUnit({ name: unitName });
              unitSet.add(unitName.toLowerCase());
            } catch (e: any) { console.error("Error creating unit:", e.message); }
          }

          const productTypeName = String(row["Product Type"] || "Medicine").trim();
          if (productTypeName && !typeSet.has(productTypeName.toLowerCase())) {
            try {
              await storage.createInventoryProductType({ name: productTypeName });
              typeSet.add(productTypeName.toLowerCase());
            } catch (e: any) { console.error("Error creating product type:", e.message); }
          }

          let sku = skuKey ? String(row[skuKey] || "").trim() : "";
          
          if (!sku) {
            console.log(`SKU missing for "${row.Name}", auto-generating for category "${categoryName}"`);
            sku = await storage.getNextItemCode(categoryName);
          }
          
          if (!sku) continue;

          let supplierId = null;
          const supplierName = String(row.Supplier || "").trim();
          if (supplierName) {
            const suppliers = await storage.getSuppliers();
            const supplier = suppliers.find(s => s.name === supplierName);
            if (supplier) supplierId = supplier.id;
          }

          const inventoryData: any = {
            sku,
            name: String(row.Name || "Unnamed Item").trim(),
            category: categoryName,
            baseUnit: unitName,
            subCategory: subCategoryName,
            quantity: Number(row.Quantity || 0),
            minQuantity: Number(row["Min Quantity"] || 0),
            mrp: String(row.MRP || "0"),
            purchasePrice: String(row["Purchase Price"] || "0"),
            salePrice: String(row["Sale Price"] || "0"),
            minSellingPrice: String(row["Min. Selling Price"] || "0"),
            taxCategoryId: row["GST Category ID"] ? Number(row["GST Category ID"]) : null,
            batchCriteria: String(row["Batch Criteria"] || "").trim() || null,
            mfgDate: row["MFG Date"] ? String(row["MFG Date"]).trim() : null,
            shelfDetails: String(row["Shelf Details"] || "").trim() || null,
            supplierId,
            batchNumber: String(row.Batch || "").trim(),
            expiryDate: row.Expiry ? String(row.Expiry).trim() : null,
            description: String(row.Description || "").trim(),
            productType: productTypeName,
            lastUpdated: new Date().toISOString(),
          };

          const existingBySku = await storage.getInventoryItemBySku(sku);
          if (existingBySku) {
            await storage.updateInventoryItem(existingBySku.id, inventoryData);
            results.updated++;
          } else {
            // Check for name/price batches even during import
            const resolution = await resolveBatchName(
              inventoryData.name, 
              String(inventoryData.mrp), 
              String(inventoryData.salePrice), 
              String(inventoryData.purchasePrice),
              inventoryData.batchCriteria
            );
            
            if (resolution.isDuplicate) {
              console.log(`IMPORT: Skipping "${inventoryData.name}" - exact duplicate found at "${resolution.name}"`);
              continue;
            }
            
            inventoryData.name = resolution.name;
            await storage.createInventoryItem(inventoryData);
            results.imported++;
          }
        } catch (err: any) {
          console.error(`ERROR PROCESSING ROW:`, err);
          results.errors.push(`Row error: ${err.message}`);
        }
      }

      logActivity(req, "IMPORT", "Inventory", undefined, `Imported ${results.imported} and updated ${results.updated} items from Excel`);
      res.json({ message: "Import completed", ...results });
    } catch (error: any) {
      res.status(500).json({ message: `Import failed: ${error.message}` });
    }
  });

  // --- Bulk update: Set sale_price = mrp for all inventory items ---
  app.post("/api/inventory/sync-mrp-to-sale-price", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    try {
      const result = await db.execute(
        sqlTag`UPDATE inventory_items SET sale_price = mrp`
      );
      const updatedCount = result.rowCount ?? 0;
      logActivity(req, "BULK_UPDATE", "Inventory", undefined, `Synced sale price to MRP for ${updatedCount} items`);
      res.json({ message: `Updated ${updatedCount} items: sale price set to MRP.`, updatedCount });
    } catch (err: any) {
      console.error("Sync MRP to sale price error:", err);
      res.status(500).json({ message: `Failed to sync prices: ${err.message}` });
    }
  });

  // --- Bulk update: Sync units from products to inventory_units ---
  app.post("/api/inventory/sync-units", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    try {
      const items = await storage.getInventoryItems();
      const existingUnits = await storage.getInventoryUnits();
      const unitSet = new Set(existingUnits.map(u => u.name.toLowerCase()));
      const unitsToAdd = new Set<string>();

      for (const item of items) {
        if (item.baseUnit && !unitSet.has(item.baseUnit.toLowerCase())) {
          unitsToAdd.add(item.baseUnit);
          unitSet.add(item.baseUnit.toLowerCase());
        }
        if (item.multiUnit && Array.isArray(item.multiUnit)) {
          for (const mu of item.multiUnit as any[]) {
            if (mu.name && !unitSet.has(mu.name.toLowerCase())) {
              unitsToAdd.add(mu.name);
              unitSet.add(mu.name.toLowerCase());
            }
          }
        }
      }

      let addedCount = 0;
      for (const unitName of unitsToAdd) {
        await storage.createInventoryUnit({ name: unitName });
        addedCount++;
      }

      logActivity(req, "BULK_UPDATE", "Inventory", undefined, `Synced ${addedCount} units from products`);
      res.json({ message: `Successfully added ${addedCount} units from existing products.`, addedCount });
    } catch (err: any) {
      console.error("Sync units error:", err);
      res.status(500).json({ message: `Failed to sync units: ${err.message}` });
    }
  });
}
