import { storage } from "../server/storage";

async function check() {
  const items = await storage.getInventoryItems();
  console.log(`Total items in inventory: ${items.length}`);
  items.forEach(item => {
    console.log(`- ID: ${item.id}, SKU: ${item.sku}, Name: ${item.name}, Category ID: ${item.categoryId}`);
  });
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
