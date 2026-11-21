import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const data = [
  {
    SKU: "TEST-001",
    Name: "Test Item 1",
    Category: "Testing",
    "Sub Category": "Manual",
    Quantity: 10,
    "Min Quantity": 2,
    "Purchase Price": "50",
    "Sale Price": "75",
    "Base Unit": "Vial",
    Supplier: "",
    Batch: "B123",
    Expiry: "2025-12-31",
    Description: "An item added via script for testing import."
  },
  {
    SKU: "TEST-002",
    Name: "Test Item 2",
    Category: "Testing",
    "Sub Category": "Auto",
    Quantity: 5,
    "Min Quantity": 1,
    "Purchase Price": "100",
    "Sale Price": "150",
    "Base Unit": "Bottle",
    Supplier: "",
    Batch: "B456",
    Expiry: "2026-06-30",
    Description: "Another item for testing import."
  }
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, "Inventory");

const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
const filePath = path.join(process.cwd(), "tmp", "test_inventory.xlsx");

if (!fs.existsSync(path.dirname(filePath))) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

fs.writeFileSync(filePath, buffer);
console.log(`Test Excel file created at: ${filePath}`);
