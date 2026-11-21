import dotenv from "dotenv";
dotenv.config();

import { storage } from "../server/storage";
import { db } from "../server/db";
import { petDocuments } from "../shared/schema";

async function test() {
  console.log("Starting backup queries test...");
  try {
    console.log("1. getOwners");
    const allOwners = await storage.getOwners();
    console.log(`Success: ${allOwners.length} owners`);

    console.log("2. getPets");
    const allPets = await storage.getPets();
    console.log(`Success: ${allPets.length} pets`);

    console.log("3. getAppointments");
    const allAppointments = await storage.getAppointments();
    console.log(`Success: ${allAppointments.length} appointments`);

    console.log("4. getMedicalRecords");
    const allRecords = await storage.getMedicalRecords();
    console.log(`Success: ${allRecords.length} records`);

    console.log("5. getFeeStructures");
    const allFees = await storage.getFeeStructures();
    console.log(`Success: ${allFees.length} fees`);

    console.log("6. getInvoices");
    const allInvoices = await storage.getInvoices();
    console.log(`Success: ${allInvoices.length} invoices`);

    console.log("7. getRoles");
    const allRoles = await storage.getRoles();
    console.log(`Success: ${allRoles.length} roles`);

    console.log("8. getAllLabReports");
    const allLabReports = await storage.getAllLabReports();
    console.log(`Success: ${allLabReports.length} lab reports`);

    console.log("9. getClinicSettings");
    const allSettings = await storage.getClinicSettings();
    console.log(`Success: ${allSettings.length} settings`);

    console.log("10. getInventoryItems");
    const allInventory = await storage.getInventoryItems();
    console.log(`Success: ${allInventory.length} inventory`);

    console.log("11. getExpenses");
    const allExpenses = await storage.getExpenses();
    console.log(`Success: ${allExpenses.length} expenses`);

    console.log("12. getSuppliers");
    const allSuppliers = await storage.getSuppliers();
    console.log(`Success: ${allSuppliers.length} suppliers`);

    console.log("13. getPurchaseOrders");
    const allPurchaseOrders = await storage.getPurchaseOrders();
    console.log(`Success: ${allPurchaseOrders.length} purchase orders`);

    console.log("14. getEstimates");
    const allEstimates = await storage.getEstimates();
    console.log(`Success: ${allEstimates.length} estimates`);

    console.log("15. petDocuments");
    const allPetDocs = await db.select().from(petDocuments);
    console.log(`Success: ${allPetDocs.length} pet docs`);

    console.log("16. getPurchases");
    const allPurchases = await storage.getPurchases();
    console.log(`Success: ${allPurchases.length} purchases`);

    console.log("17. getInvoiceItems");
    if (allInvoices.length > 0) {
      await storage.getInvoiceItems(allInvoices[0].id);
      console.log("Success: getInvoiceItems");
    }

    console.log("18. getEstimateItems");
    if (allEstimates.length > 0) {
      await storage.getEstimateItems(allEstimates[0].id);
      console.log("Success: getEstimateItems");
    }

    console.log("19. getPurchaseOrderItems");
    if (allPurchaseOrders.length > 0) {
      await storage.getPurchaseOrderItems(allPurchaseOrders[0].id);
      console.log("Success: getPurchaseOrderItems");
    }

    console.log("20. getPurchaseItems");
    if (allPurchases.length > 0) {
      await storage.getPurchaseItems(allPurchases[0].id);
      console.log("Success: getPurchaseItems");
    }

    console.log("ALL QUERIES PASSED!");
  } catch (err: any) {
    console.error("FAILED WITH ERROR:", err);
  }
}

test().then(() => process.exit(0));
