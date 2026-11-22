import {
  type Owner, type InsertOwner,
  type Pet, type InsertPet,
  type Appointment, type InsertAppointment,
  type MedicalRecord, type InsertMedicalRecord,
  type User, type InsertUser,
  type Role, type InsertRole,
  type FeeStructure, type InsertFeeStructure,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type ClinicSetting,
  type InventoryItem, type InsertInventoryItem,
  type Supplier, type InsertSupplier,
  type PurchaseOrder, type InsertPurchaseOrder,
  type PurchaseOrderItem, type InsertPurchaseOrderItem,
  type Expense, type InsertExpense,
  type ActivityLog, type InsertActivityLog,
  type PetDocument, type InsertPetDocument,
  type Estimate, type InsertEstimate,
  type EstimateItem, type InsertEstimateItem,
  owners, pets, appointments, medicalRecords, users,
  roles, feeStructures, invoices, invoiceItems, clinicSettings,
  inventoryItems, expenses, suppliers, purchaseOrders, purchaseOrderItems,
  activityLogs, petDocuments,
  estimates, estimateItems,
  type LabReport, type InsertLabReport, labReports,
  type LabCategory, type InsertLabCategory, labTestCategories,
  type LabTest, type InsertLabTest, labTests,
  type LabRefRange, type InsertLabRefRange, labRefRanges,
  type Species, type InsertSpecies, species,
  type BloodSmearPathogen, type InsertBloodSmearPathogen, bloodSmearPathogens,
  type InventorySubCategory, type InsertInventorySubCategory, inventorySubCategories,
  type InventoryUnit, type InsertInventoryUnit, inventoryUnits,
  type InventoryCategory, type InsertInventoryCategory, inventoryCategories,
  type InventoryProductType, type InsertInventoryProductType, inventoryProductTypes,
  type TaxCategory, type InsertTaxCategory, taxCategories,
  type LedgerEntry, type InsertLedgerEntry, ledgerEntries,
  type Purchase, type InsertPurchase, purchases,
  type PurchaseItem, type InsertPurchaseItem, purchaseItems,
  type ExpenseCategory, type InsertExpenseCategory, expenseCategories,
} from "../shared/schema";
import { db } from "./db";
import { eq, sql, lte, desc, and, gte, ilike } from "drizzle-orm";

export interface IStorage {
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;

  getOwners(): Promise<Owner[]>;
  getOwner(id: number): Promise<Owner | undefined>;
  getOwnerByPhone(phone: string): Promise<Owner | undefined>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined>;
  deleteOwner(id: number): Promise<void>;

  getPets(): Promise<Pet[]>;
  getPet(id: number): Promise<Pet | undefined>;
  getPetsByOwner(ownerId: number): Promise<Pet[]>;
  createPet(pet: InsertPet): Promise<Pet>;
  updatePet(id: number, pet: Partial<InsertPet>): Promise<Pet | undefined>;
  deletePet(id: number): Promise<void>;

  getAppointments(): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, data: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<void>;

  getMedicalRecords(): Promise<MedicalRecord[]>;
  getMedicalRecord(id: number): Promise<MedicalRecord | undefined>;
  getMedicalRecordsByPet(petId: number): Promise<MedicalRecord[]>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: number, data: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined>;
  deleteMedicalRecord(id: number): Promise<void>;

  getRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, data: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: number): Promise<void>;

  getFeeStructures(): Promise<FeeStructure[]>;
  getFeeStructure(id: number): Promise<FeeStructure | undefined>;
  createFeeStructure(fee: InsertFeeStructure): Promise<FeeStructure>;
  updateFeeStructure(id: number, data: Partial<InsertFeeStructure>): Promise<FeeStructure | undefined>;
  deleteFeeStructure(id: number): Promise<void>;

  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<void>;

  getNextInvoiceNumber(): Promise<string>;
  getAndIncrementNextInvoiceNumber(): Promise<string>;
  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  deleteInvoiceItem(id: number): Promise<void>;
  deleteInvoiceItemsByInvoice(invoiceId: number): Promise<void>;

  getClinicSettings(): Promise<ClinicSetting[]>;
  getClinicSetting(key: string): Promise<ClinicSetting | undefined>;
  upsertClinicSetting(key: string, value: string): Promise<ClinicSetting>;
  upsertClinicSettings(settings: { key: string; value: string }[]): Promise<ClinicSetting[]>;

  eraseAllMedicalRecords(): Promise<number>;
  eraseAllAppointments(): Promise<number>;
  eraseAllPets(): Promise<number>;
  eraseAllOwners(): Promise<number>;
  eraseAllInvoices(): Promise<number>;
  eraseAllLabReports(): Promise<number>;
  eraseAllData(): Promise<{ medicalRecords: number; appointments: number; invoiceItems: number; invoices: number; pets: number; owners: number; labReports: number; estimates: number; petDocuments: number }>;

  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItemsByBaseName(name: string): Promise<InventoryItem[]>;
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  getInventoryItemBySku(sku: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  upsertInventoryItem(sku: string, data: InsertInventoryItem): Promise<InventoryItem>;
  deleteInventoryItem(id: number): Promise<void>;
  getNextItemCode(category: string): Promise<string>;

  getInventorySubCategories(): Promise<InventorySubCategory[]>;
  createInventorySubCategory(subCategory: InsertInventorySubCategory): Promise<InventorySubCategory>;
  deleteInventorySubCategory(id: number): Promise<void>;

  getInventoryUnits(): Promise<InventoryUnit[]>;
  getInventoryUnitByName(name: string): Promise<InventoryUnit | undefined>;
  createInventoryUnit(unit: InsertInventoryUnit): Promise<InventoryUnit>;
  deleteInventoryUnit(id: number): Promise<void>;

  getInventoryCategories(): Promise<InventoryCategory[]>;
  getInventoryCategoryByName(name: string): Promise<InventoryCategory | undefined>;
  createInventoryCategory(category: InsertInventoryCategory): Promise<InventoryCategory>;
  deleteInventoryCategory(id: number): Promise<void>;

  getInventoryProductTypes(): Promise<InventoryProductType[]>;
  getInventoryProductTypeByName(name: string): Promise<InventoryProductType | undefined>;
  createInventoryProductType(productType: InsertInventoryProductType): Promise<InventoryProductType>;
  deleteInventoryProductType(id: number): Promise<void>;

  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, data: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<void>;

  // Purchase Orders
  getPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: number, data: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined>;
  deletePurchaseOrder(id: number): Promise<void>;
  getPurchaseOrderItems(purchaseOrderId: number): Promise<PurchaseOrderItem[]>;
  createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem>;
  deletePurchaseOrderItem(id: number): Promise<void>;
  getNextPurchaseOrderNumber(): Promise<string>;
  getAndIncrementNextPurchaseOrderNumber(): Promise<string>;

  // Purchases
  getPurchases(): Promise<Purchase[]>;
  getPurchase(id: number): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchase(id: number, data: Partial<InsertPurchase>): Promise<Purchase | undefined>;
  deletePurchase(id: number): Promise<void>;
  getPurchaseItems(purchaseId: number): Promise<PurchaseItem[]>;
  createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem>;
  deletePurchaseItem(id: number): Promise<void>;
  deletePurchaseItemsByPurchase(purchaseId: number): Promise<void>;
  getNextPurchaseNumber(): Promise<string>;
  getAndIncrementNextPurchaseNumber(): Promise<string>;

  // Low stock
  getLowStockItems(): Promise<InventoryItem[]>;

  getLabReportsByPetId(petId: number): Promise<LabReport[]>;
  getAllLabReports(): Promise<LabReport[]>;
  createLabReport(report: InsertLabReport): Promise<LabReport>;
  updateLabReport(id: number, report: Partial<InsertLabReport>): Promise<LabReport | undefined>;
  deleteLabReport(id: number): Promise<void>;

  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number, offset?: number, filters?: { userId?: number; entityType?: string; startDate?: string; endDate?: string }): Promise<ActivityLog[]>;
  getActivityLogCount(filters?: { userId?: number; entityType?: string; startDate?: string; endDate?: string }): Promise<number>;
  deleteActivityLogs(beforeDate?: string): Promise<number>;

  // Pet Documents
  getPetDocuments(petId: number): Promise<PetDocument[]>;
  createPetDocument(doc: InsertPetDocument): Promise<PetDocument>;
  deletePetDocument(id: number): Promise<void>;

  // Blood Smear Pathogens
  getBloodSmearPathogens(species?: string): Promise<BloodSmearPathogen[]>;
  createBloodSmearPathogen(pathogen: InsertBloodSmearPathogen): Promise<BloodSmearPathogen>;
  updateBloodSmearPathogen(id: number, data: Partial<InsertBloodSmearPathogen>): Promise<BloodSmearPathogen | undefined>;
  deleteBloodSmearPathogen(id: number): Promise<void>;

  // Species
  getSpecies(): Promise<Species[]>;
  createSpecies(species: InsertSpecies): Promise<Species>;
  deleteSpecies(id: number): Promise<void>;

  // Dynamic Lab Configuration
  getLabCategories(): Promise<LabCategory[]>;
  createLabCategory(category: InsertLabCategory): Promise<LabCategory>;
  updateLabCategory(id: number, data: Partial<InsertLabCategory>): Promise<LabCategory | undefined>;
  deleteLabCategory(id: number): Promise<void>;

  getLabTests(categoryId?: number): Promise<LabTest[]>;
  createLabTest(test: InsertLabTest): Promise<LabTest>;
  updateLabTest(id: number, data: Partial<InsertLabTest>): Promise<LabTest | undefined>;
  deleteLabTest(id: number): Promise<void>;

  getLabRefRanges(testId?: number): Promise<LabRefRange[]>;
  createLabRefRange(range: InsertLabRefRange): Promise<LabRefRange>;
  updateLabRefRange(id: number, data: Partial<InsertLabRefRange>): Promise<LabRefRange | undefined>;
  deleteLabRefRange(id: number): Promise<void>;

  // Estimates
  getEstimates(): Promise<Estimate[]>;
  getEstimate(id: number): Promise<Estimate | undefined>;
  createEstimate(est: InsertEstimate): Promise<Estimate>;
  updateEstimate(id: number, data: Partial<InsertEstimate>): Promise<Estimate | undefined>;
  deleteEstimate(id: number): Promise<void>;
  getNextEstimateNumber(): Promise<string>;
  getAndIncrementNextEstimateNumber(): Promise<string>;
  getEstimateItems(estimateId: number): Promise<EstimateItem[]>;
  createEstimateItem(item: InsertEstimateItem): Promise<EstimateItem>;
  deleteEstimateItemsByEstimate(estimateId: number): Promise<void>;

  getTaxCategories(): Promise<TaxCategory[]>;
  createTaxCategory(data: InsertTaxCategory): Promise<TaxCategory>;
  updateTaxCategory(id: number, data: Partial<InsertTaxCategory>): Promise<TaxCategory | undefined>;
  deleteTaxCategory(id: number): Promise<void>;

  getExpenseCategories(): Promise<ExpenseCategory[]>;
  createExpenseCategory(data: InsertExpenseCategory): Promise<ExpenseCategory>;
  updateExpenseCategory(id: number, data: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined>;
  deleteExpenseCategory(id: number): Promise<void>;

  // General Ledger
  getLedgerEntries(filters?: { startDate?: string; endDate?: string; type?: string; search?: string }): Promise<LedgerEntry[]>;
  createLedgerEntry(entry: InsertLedgerEntry): Promise<LedgerEntry>;
  deleteLedgerEntry(id: number): Promise<void>;
  getLedgerEntryByReference(type: string, id: number): Promise<LedgerEntry | undefined>;
  getNextVoucherNumber(type: string): Promise<string>;
  getRevenueBreakdown(startDate: string, endDate: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getOwners(): Promise<Owner[]> {
    return db.select().from(owners).orderBy(desc(owners.id));
  }

  async getOwner(id: number): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, id));
    return owner;
  }

  async getOwnerByPhone(phone: string): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.phone, phone));
    return owner;
  }

  async createOwner(owner: InsertOwner): Promise<Owner> {
    const [created] = await db.insert(owners).values(owner).returning();
    return created;
  }

  async updateOwner(id: number, data: Partial<InsertOwner>): Promise<Owner | undefined> {
    const [updated] = await db.update(owners).set(data).where(eq(owners.id, id)).returning();
    return updated;
  }

  async deleteOwner(id: number): Promise<void> {
    await db.delete(owners).where(eq(owners.id, id));
  }

  async getPets(): Promise<Pet[]> {
    return db.select().from(pets).orderBy(desc(pets.id));
  }

  async getPet(id: number): Promise<Pet | undefined> {
    const [pet] = await db.select().from(pets).where(eq(pets.id, id));
    return pet;
  }

  async getPetsByOwner(ownerId: number): Promise<Pet[]> {
    return db.select().from(pets).where(eq(pets.ownerId, ownerId));
  }

  async createPet(pet: InsertPet): Promise<Pet> {
    const [created] = await db.insert(pets).values(pet).returning();
    return created;
  }

  async updatePet(id: number, data: Partial<InsertPet>): Promise<Pet | undefined> {
    const [updated] = await db.update(pets).set(data).where(eq(pets.id, id)).returning();
    return updated;
  }

  async deletePet(id: number): Promise<void> {
    await db.delete(pets).where(eq(pets.id, id));
  }

  async getAppointments(): Promise<Appointment[]> {
    return db.select().from(appointments);
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [apt] = await db.select().from(appointments).where(eq(appointments.id, id));
    return apt;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [created] = await db.insert(appointments).values(appointment).returning();
    return created;
  }

  async updateAppointment(id: number, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments).set(data).where(eq(appointments.id, id)).returning();
    return updated;
  }

  async deleteAppointment(id: number): Promise<void> {
    await db.delete(appointments).where(eq(appointments.id, id));
  }

  async getMedicalRecords(): Promise<MedicalRecord[]> {
    return db.select().from(medicalRecords);
  }

  async getMedicalRecord(id: number): Promise<MedicalRecord | undefined> {
    const [record] = await db.select().from(medicalRecords).where(eq(medicalRecords.id, id));
    return record;
  }

  async getMedicalRecordsByPet(petId: number): Promise<MedicalRecord[]> {
    return db.select().from(medicalRecords).where(eq(medicalRecords.petId, petId));
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const [created] = await db.insert(medicalRecords).values(record).returning();
    return created;
  }

  async updateMedicalRecord(id: number, data: Partial<InsertMedicalRecord>): Promise<MedicalRecord | undefined> {
    const [updated] = await db.update(medicalRecords).set(data).where(eq(medicalRecords.id, id)).returning();
    return updated;
  }

  async deleteMedicalRecord(id: number): Promise<void> {
    await db.delete(medicalRecords).where(eq(medicalRecords.id, id));
  }

  async getRoles(): Promise<Role[]> {
    return db.select().from(roles);
  }

  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.name, name));
    return role;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [created] = await db.insert(roles).values(role).returning();
    return created;
  }

  async updateRole(id: number, data: Partial<InsertRole>): Promise<Role | undefined> {
    const [updated] = await db.update(roles).set(data).where(eq(roles.id, id)).returning();
    return updated;
  }

  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  async getFeeStructures(): Promise<FeeStructure[]> {
    return db.select().from(feeStructures);
  }

  async getFeeStructure(id: number): Promise<FeeStructure | undefined> {
    const [fee] = await db.select().from(feeStructures).where(eq(feeStructures.id, id));
    return fee;
  }

  async createFeeStructure(fee: InsertFeeStructure): Promise<FeeStructure> {
    const [created] = await db.insert(feeStructures).values(fee).returning();
    return created;
  }

  async updateFeeStructure(id: number, data: Partial<InsertFeeStructure>): Promise<FeeStructure | undefined> {
    const [updated] = await db.update(feeStructures).set(data).where(eq(feeStructures.id, id)).returning();
    return updated;
  }

  async deleteFeeStructure(id: number): Promise<void> {
    await db.delete(feeStructures).where(eq(feeStructures.id, id));
  }

  async getInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices).orderBy(desc(invoices.id));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    let finalInvoiceNumber = invoice.invoiceNumber;
    
    if (!finalInvoiceNumber || finalInvoiceNumber.startsWith("#TEMP-")) {
      finalInvoiceNumber = await this.getAndIncrementNextInvoiceNumber();
    }
    
    const [created] = await db.insert(invoices).values({ ...invoice, invoiceNumber: finalInvoiceNumber }).returning();
    return created;
  }

  async updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const existing = await this.getInvoice(id);
    if (!existing) return undefined;

    const [updated] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getNextInvoiceNumber(): Promise<string> {
    const setting = await this.getClinicSetting("next_invoice_number");
    const prefixSetting = await this.getClinicSetting("sales_invoice_prefix");
    const prefix = prefixSetting?.settingValue || "#PET-";
    
    let nextNum: number;
    if (setting && setting.settingValue) {
      nextNum = parseInt(setting.settingValue);
    } else {
      const result = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(invoices);
      nextNum = (result[0]?.maxId || 0) + 1;
    }
    return `${prefix}${String(nextNum).padStart(4, "0")}`;
  }

  async getAndIncrementNextInvoiceNumber(): Promise<string> {
    return await db.transaction(async (tx) => {
      const [setting] = await tx
        .select()
        .from(clinicSettings)
        .where(eq(clinicSettings.settingKey, "next_invoice_number"))
        .for("update");

      const [prefixSetting] = await tx
        .select()
        .from(clinicSettings)
        .where(eq(clinicSettings.settingKey, "sales_invoice_prefix"));
      const prefix = prefixSetting?.settingValue || "#PET-";

      let nextNum: number;
      if (setting && setting.settingValue) {
        nextNum = parseInt(setting.settingValue);
      } else {
        const result = await tx.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(invoices);
        nextNum = (result[0]?.maxId || 0) + 1;
      }

      const formattedNumber = `${prefix}${String(nextNum).padStart(4, "0")}`;

      await tx
        .insert(clinicSettings)
        .values({ settingKey: "next_invoice_number", settingValue: String(nextNum + 1) })
        .onConflictDoUpdate({
          target: clinicSettings.settingKey,
          set: { settingValue: String(nextNum + 1) },
        });

      return formattedNumber;
    });
  }

  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [created] = await db.insert(invoiceItems).values(item).returning();
    return created;
  }

  async deleteInvoiceItem(id: number): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
  }

  async deleteInvoiceItemsByInvoice(invoiceId: number): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async getClinicSettings(): Promise<ClinicSetting[]> {
    return db.select().from(clinicSettings);
  }

  async getClinicSetting(key: string): Promise<ClinicSetting | undefined> {
    const [setting] = await db.select().from(clinicSettings).where(eq(clinicSettings.settingKey, key));
    return setting;
  }

  async upsertClinicSetting(key: string, value: string): Promise<ClinicSetting> {
    const [result] = await db
      .insert(clinicSettings)
      .values({ settingKey: key, settingValue: value })
      .onConflictDoUpdate({
        target: [clinicSettings.tenantId, clinicSettings.settingKey],
        set: { settingValue: value },
      })
      .returning();
    return result;
  }

  async upsertClinicSettings(settings: { key: string; value: string }[]): Promise<ClinicSetting[]> {
    return Promise.all(settings.map(s => this.upsertClinicSetting(s.key, s.value)));
  }

  async eraseAllMedicalRecords(): Promise<number> {
    const existing = await db.select().from(medicalRecords);
    await db.delete(medicalRecords);
    return existing.length;
  }

  async eraseAllAppointments(): Promise<number> {
    const existing = await db.select().from(appointments);
    await db.delete(medicalRecords);
    await db.delete(appointments);
    return existing.length;
  }

  async eraseAllPets(): Promise<number> {
    const existing = await db.select().from(pets);
    await db.delete(medicalRecords);
    await db.delete(appointments);
    await db.delete(pets);
    return existing.length;
  }

  async eraseAllOwners(): Promise<number> {
    const existing = await db.select().from(owners);
    await db.delete(medicalRecords);
    await db.delete(appointments);
    await db.delete(invoiceItems);
    await db.delete(invoices);
    await db.delete(pets);
    await db.delete(owners);
    return existing.length;
  }

  async eraseAllInvoices(): Promise<number> {
    const existing = await db.select().from(invoices);
    await db.delete(invoiceItems);
    await db.delete(invoices);
    return existing.length;
  }

  async eraseAllLabReports(): Promise<number> {
    const existing = await db.select().from(labReports);
    await db.delete(labReports);
    return existing.length;
  }

  async eraseAllData(): Promise<{ medicalRecords: number; appointments: number; invoiceItems: number; invoices: number; pets: number; owners: number; labReports: number; estimates: number; petDocuments: number }> {
    const [recs, apts, items, invs, allPets, allOwners, allLabReports, allEstimates, allPetDocs] = await Promise.all([
      db.select().from(medicalRecords),
      db.select().from(appointments),
      db.select().from(invoiceItems),
      db.select().from(invoices),
      db.select().from(pets),
      db.select().from(owners),
      db.select().from(labReports),
      db.select().from(estimates),
      db.select().from(petDocuments),
    ]);

    // Wipe everything to leave a completely clean slate
    // Start with child tables (foreign key dependencies)
    await db.delete(labReports);
    await db.delete(medicalRecords);
    await db.delete(appointments);
    await db.delete(invoiceItems);
    await db.delete(invoices);
    await db.delete(purchaseOrderItems);
    await db.delete(purchaseOrders);
    await db.delete(purchaseItems);
    await db.delete(purchases);

    await db.delete(estimateItems);
    await db.delete(estimates);
    await db.delete(petDocuments);
    await db.delete(activityLogs);
    await db.delete(ledgerEntries);
    await db.delete(expenses);
    await db.delete(feeStructures);

    // Main tables and metadata
    await db.delete(inventoryItems);
    await db.delete(suppliers);
    await db.delete(inventorySubCategories);
    await db.delete(inventoryUnits);
    await db.delete(inventoryCategories);
    await db.delete(inventoryProductTypes);
    await db.delete(taxCategories);
    await db.delete(species);
    await db.delete(bloodSmearPathogens);

    // Lab configuration
    await db.delete(labRefRanges);
    await db.delete(labTests);
    await db.delete(labTestCategories);

    // Pets and Owners must be deleted last because of relationships
    await db.delete(pets);
    await db.delete(owners);

    return {
      medicalRecords: recs.length,
      appointments: apts.length,
      invoiceItems: items.length,
      invoices: invs.length,
      pets: allPets.length,
      owners: allOwners.length,
      labReports: allLabReports.length,
      estimates: allEstimates.length,
      petDocuments: allPetDocs.length,
    };
  }
  async getInventoryItems(): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems);
  }

  async getInventoryItemsByBaseName(name: string): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(ilike(inventoryItems.name, `${name}%`));
  }

  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }
  
  async getInventoryItemBySku(sku: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.sku, sku));
    return item;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [created] = await db.insert(inventoryItems).values(item).returning();
    const realNumber = `PRD-${String(created.id).padStart(4, "0")}`;
    if (!created.productId || created.productId !== realNumber) {
      const [updated] = await db
        .update(inventoryItems)
        .set({ productId: realNumber })
        .where(eq(inventoryItems.id, created.id))
        .returning();
      return updated;
    }
    return created;
  }
  
  async getNextItemCode(category: string): Promise<string> {
    const rawPrefix = String(category || "GEN").substring(0, 3).toUpperCase();
    const prefix = rawPrefix.length >= 3 ? rawPrefix : rawPrefix.padEnd(3, 'X');
    
    const items = await db.select().from(inventoryItems).where(ilike(inventoryItems.sku, `${prefix}%`));
    
    let lastNumber = 0;
    for (const item of items) {
      const numPart = item.sku.substring(prefix.length);
      const num = parseInt(numPart);
      if (!isNaN(num) && num > lastNumber) {
        lastNumber = num;
      }
    }
    
    const nextNumber = lastNumber + 1;
    return `${prefix}${String(nextNumber).padStart(7, "0")}`;
  }

  async updateInventoryItem(id: number, data: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const [updated] = await db.update(inventoryItems).set(data).where(eq(inventoryItems.id, id)).returning();
    return updated;
  }

  async upsertInventoryItem(sku: string, data: InsertInventoryItem): Promise<InventoryItem> {
    const existing = await this.getInventoryItemBySku(sku);
    if (existing) {
      const updated = await this.updateInventoryItem(existing.id, data);
      return updated!;
    }
    return this.createInventoryItem(data);
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  async getInventorySubCategories(): Promise<InventorySubCategory[]> {
    return db.select().from(inventorySubCategories).orderBy(inventorySubCategories.name);
  }

  async createInventorySubCategory(data: InsertInventorySubCategory): Promise<InventorySubCategory> {
    const [created] = await db.insert(inventorySubCategories).values(data).returning();
    return created;
  }

  async deleteInventorySubCategory(id: number): Promise<void> {
    await db.delete(inventorySubCategories).where(eq(inventorySubCategories.id, id));
  }

  async getInventoryUnits(): Promise<InventoryUnit[]> {
    return db.select().from(inventoryUnits).orderBy(inventoryUnits.name);
  }

  async createInventoryUnit(data: InsertInventoryUnit): Promise<InventoryUnit> {
    const [created] = await db.insert(inventoryUnits).values(data).returning();
    return created;
  }

  async getInventoryUnitByName(name: string): Promise<InventoryUnit | undefined> {
    const [unit] = await db.select().from(inventoryUnits).where(eq(inventoryUnits.name, name));
    return unit;
  }

  async deleteInventoryUnit(id: number): Promise<void> {
    await db.delete(inventoryUnits).where(eq(inventoryUnits.id, id));
  }

  async getInventoryCategories(): Promise<InventoryCategory[]> {
    return db.select().from(inventoryCategories).orderBy(inventoryCategories.name);
  }

  async createInventoryCategory(data: InsertInventoryCategory): Promise<InventoryCategory> {
    const [created] = await db.insert(inventoryCategories).values(data).returning();
    return created;
  }

  async getInventoryCategoryByName(name: string): Promise<InventoryCategory | undefined> {
    const [category] = await db.select().from(inventoryCategories).where(eq(inventoryCategories.name, name));
    return category;
  }

  async deleteInventoryCategory(id: number): Promise<void> {
    await db.delete(inventoryCategories).where(eq(inventoryCategories.id, id));
  }

  async getInventoryProductTypes(): Promise<InventoryProductType[]> {
    return db.select().from(inventoryProductTypes).orderBy(inventoryProductTypes.name);
  }

  async createInventoryProductType(data: InsertInventoryProductType): Promise<InventoryProductType> {
    const [created] = await db.insert(inventoryProductTypes).values(data).returning();
    return created;
  }

  async getInventoryProductTypeByName(name: string): Promise<InventoryProductType | undefined> {
    const [productType] = await db.select().from(inventoryProductTypes).where(eq(inventoryProductTypes.name, name));
    return productType;
  }

  async deleteInventoryProductType(id: number): Promise<void> {
    await db.delete(inventoryProductTypes).where(eq(inventoryProductTypes.id, id));
  }

  async getExpenses(): Promise<Expense[]> {
    return db.select().from(expenses);
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense).returning();
    return created;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async getLabReportsByPetId(petId: number): Promise<LabReport[]> {
    return db.select().from(labReports).where(eq(labReports.petId, petId)).orderBy(desc(labReports.id));
  }

  async createLabReport(report: InsertLabReport): Promise<LabReport> {
    const [created] = await db.insert(labReports).values(report as any).returning();
    return created;
  }

  async getAllLabReports(): Promise<LabReport[]> {
    return db.select().from(labReports).orderBy(desc(labReports.id));
  }

  async updateLabReport(id: number, data: Partial<InsertLabReport>): Promise<LabReport | undefined> {
    const [updated] = await db.update(labReports).set(data as any).where(eq(labReports.id, id)).returning();
    return updated;
  }

  async deleteLabReport(id: number): Promise<void> {
    await db.delete(labReports).where(eq(labReports.id, id));
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return db.select().from(suppliers);
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [s] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return s;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [created] = await db.insert(suppliers).values(supplier).returning();
    return created;
  }

  async updateSupplier(id: number, data: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updated] = await db.update(suppliers).set(data).where(eq(suppliers.id, id)).returning();
    return updated;
  }

  async deleteSupplier(id: number): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  // Purchase Orders
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return db.select().from(purchaseOrders);
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrder | undefined> {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return po;
  }

  async createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder> {
    let num = order.orderNumber;
    if (!num) {
      num = await this.getAndIncrementNextPurchaseOrderNumber();
    }
    const [created] = await db.insert(purchaseOrders).values({ ...order, orderNumber: num }).returning();
    return created;
  }

  async getAndIncrementNextPurchaseOrderNumber(): Promise<string> {
    return await db.transaction(async (tx) => {
      const [setting] = await tx
        .select()
        .from(clinicSettings)
        .where(eq(clinicSettings.settingKey, "next_purchase_order_number"))
        .for("update");

      const [prefixSetting] = await tx
        .select()
        .from(clinicSettings)
        .where(eq(clinicSettings.settingKey, "purchase_order_prefix"));
      const prefix = prefixSetting?.settingValue || "PO-";

      let nextNum: number;
      if (setting && setting.settingValue) {
        nextNum = parseInt(setting.settingValue);
      } else {
        const result = await tx.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(purchaseOrders);
        nextNum = (result[0]?.maxId || 0) + 1;
      }

      const formattedNumber = `${prefix}${String(nextNum).padStart(4, "0")}`;

      await tx
        .insert(clinicSettings)
        .values({ settingKey: "next_purchase_order_number", settingValue: String(nextNum + 1) })
        .onConflictDoUpdate({
          target: clinicSettings.settingKey,
          set: { settingValue: String(nextNum + 1) },
        });

      return formattedNumber;
    });
  }

  async updatePurchaseOrder(id: number, data: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder | undefined> {
    const [updated] = await db.update(purchaseOrders).set(data).where(eq(purchaseOrders.id, id)).returning();
    return updated;
  }

  async deletePurchaseOrder(id: number): Promise<void> {
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
  }

  async getPurchaseOrderItems(purchaseOrderId: number): Promise<PurchaseOrderItem[]> {
    return db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));
  }

  async createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem> {
    const [created] = await db.insert(purchaseOrderItems).values(item).returning();
    return created;
  }

  async deletePurchaseOrderItem(id: number): Promise<void> {
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, id));
  }

  // Purchases
  async getPurchases(): Promise<Purchase[]> {
    return db.select().from(purchases).orderBy(desc(purchases.id));
  }

  async getPurchase(id: number): Promise<Purchase | undefined> {
    const [p] = await db.select().from(purchases).where(eq(purchases.id, id));
    return p;
  }

  async createPurchase(data: InsertPurchase): Promise<Purchase> {
    let num = data.purchaseNumber;
    if (!num || num.startsWith("#TEMP-")) {
      num = await this.getAndIncrementNextPurchaseNumber();
    }
    const [created] = await db.insert(purchases).values({ ...data, purchaseNumber: num }).returning();
    return created;
  }

  async getAndIncrementNextPurchaseNumber(): Promise<string> {
    return await db.transaction(async (tx) => {
      const [setting] = await tx
        .select()
        .from(clinicSettings)
        .where(eq(clinicSettings.settingKey, "next_purchase_number"))
        .for("update");

      const [prefixSetting] = await tx
        .select()
        .from(clinicSettings)
        .where(eq(clinicSettings.settingKey, "purchase_invoice_prefix"));
      const prefix = prefixSetting?.settingValue || "PUR-";

      let nextNum: number;
      if (setting && setting.settingValue) {
        nextNum = parseInt(setting.settingValue);
      } else {
        const result = await tx.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(purchases);
        nextNum = (result[0]?.maxId || 0) + 1;
      }

      const formattedNumber = `${prefix}${String(nextNum).padStart(4, "0")}`;

      await tx
        .insert(clinicSettings)
        .values({ settingKey: "next_purchase_number", settingValue: String(nextNum + 1) })
        .onConflictDoUpdate({
          target: clinicSettings.settingKey,
          set: { settingValue: String(nextNum + 1) },
        });

      return formattedNumber;
    });
  }

  async updatePurchase(id: number, data: Partial<InsertPurchase>): Promise<Purchase | undefined> {
    const [updated] = await db.update(purchases).set(data).where(eq(purchases.id, id)).returning();
    return updated;
  }

  async deletePurchase(id: number): Promise<void> {
    await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));
    await db.delete(purchases).where(eq(purchases.id, id));
  }

  async getPurchaseItems(purchaseId: number): Promise<PurchaseItem[]> {
    return db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
  }

  async createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem> {
    const [created] = await db.insert(purchaseItems).values(item).returning();
    return created;
  }

  async deletePurchaseItem(id: number): Promise<void> {
    await db.delete(purchaseItems).where(eq(purchaseItems.id, id));
  }

  async deletePurchaseItemsByPurchase(purchaseId: number): Promise<void> {
    await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId));
  }

  async getNextPurchaseNumber(): Promise<string> {
    const setting = await this.getClinicSetting("next_purchase_number");
    const prefixSetting = await this.getClinicSetting("purchase_invoice_prefix");
    const prefix = prefixSetting?.settingValue || "PUR-";
    
    let nextNum: number;
    if (setting && setting.settingValue) {
      nextNum = parseInt(setting.settingValue);
    } else {
      const [res] = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(purchases);
      nextNum = (res?.maxId || 0) + 1;
    }
    return `${prefix}${String(nextNum).padStart(4, "0")}`;
  }

  async getNextPurchaseOrderNumber(): Promise<string> {
    const setting = await this.getClinicSetting("next_purchase_order_number");
    const prefixSetting = await this.getClinicSetting("purchase_order_prefix");
    const prefix = prefixSetting?.settingValue || "PO-";
    
    let nextNum: number;
    if (setting && setting.settingValue) {
      nextNum = parseInt(setting.settingValue);
    } else {
      const [res] = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(purchaseOrders);
      nextNum = (res?.maxId || 0) + 1;
    }
    return `${prefix}${String(nextNum).padStart(4, "0")}`;
  }

  // Low stock
  async getLowStockItems(): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(
      sql`${inventoryItems.quantity} <= ${inventoryItems.minQuantity}`
    );
  }

  // Activity Logs
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values(log).returning();
    return created;
  }

  async getActivityLogs(limit = 50, offset = 0, filters?: { userId?: number; entityType?: string; startDate?: string; endDate?: string }): Promise<ActivityLog[]> {
    const conditions = [];
    if (filters?.userId) conditions.push(eq(activityLogs.userId, filters.userId));
    if (filters?.entityType) conditions.push(eq(activityLogs.entityType, filters.entityType));
    if (filters?.startDate) conditions.push(gte(activityLogs.timestamp, new Date(filters.startDate)));
    if (filters?.endDate) conditions.push(lte(activityLogs.timestamp, new Date(filters.endDate + "T23:59:59")));

    const query = db.select().from(activityLogs);
    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(desc(activityLogs.timestamp)).limit(limit).offset(offset);
    }
    return query.orderBy(desc(activityLogs.timestamp)).limit(limit).offset(offset);
  }

  async getActivityLogCount(filters?: { userId?: number; entityType?: string; startDate?: string; endDate?: string }): Promise<number> {
    const conditions = [];
    if (filters?.userId) conditions.push(eq(activityLogs.userId, filters.userId));
    if (filters?.entityType) conditions.push(eq(activityLogs.entityType, filters.entityType));
    if (filters?.startDate) conditions.push(gte(activityLogs.timestamp, new Date(filters.startDate)));
    if (filters?.endDate) conditions.push(lte(activityLogs.timestamp, new Date(filters.endDate + "T23:59:59")));

    const query = db.select({ count: sql<number>`count(*)` }).from(activityLogs);
    if (conditions.length > 0) {
      const [result] = await query.where(and(...conditions));
      return Number(result.count);
    }
    const [result] = await query;
    return Number(result.count);
  }

  async deleteActivityLogs(beforeDate?: string): Promise<number> {
    if (beforeDate) {
      const cutoff = new Date(beforeDate + "T23:59:59");
      const existing = await db.select({ count: sql<number>`count(*)` }).from(activityLogs).where(lte(activityLogs.timestamp, cutoff));
      const count = Number(existing[0]?.count || 0);
      await db.delete(activityLogs).where(lte(activityLogs.timestamp, cutoff));
      return count;
    }
    const existing = await db.select({ count: sql<number>`count(*)` }).from(activityLogs);
    const count = Number(existing[0]?.count || 0);
    await db.delete(activityLogs);
    return count;
  }

  // Pet Documents
  async getPetDocuments(petId: number): Promise<PetDocument[]> {
    return db.select().from(petDocuments).where(eq(petDocuments.petId, petId)).orderBy(desc(petDocuments.uploadedAt));
  }

  async createPetDocument(doc: InsertPetDocument): Promise<PetDocument> {
    const [created] = await db.insert(petDocuments).values(doc).returning();
    return created;
  }

  async deletePetDocument(id: number): Promise<void> {
    await db.delete(petDocuments).where(eq(petDocuments.id, id));
  }

  // Species
  async getSpecies(): Promise<Species[]> {
    return db.select().from(species).orderBy(species.name);
  }

  async createSpecies(data: InsertSpecies): Promise<Species> {
    const [created] = await db.insert(species).values(data).returning();
    return created;
  }

  async deleteSpecies(id: number): Promise<void> {
    await db.delete(species).where(eq(species.id, id));
  }

  // Dynamic Lab Configuration
  async getLabCategories(): Promise<LabCategory[]> {
    return db.select().from(labTestCategories).orderBy(labTestCategories.name);
  }

  async createLabCategory(category: InsertLabCategory): Promise<LabCategory> {
    const [created] = await db.insert(labTestCategories).values(category).returning();
    return created;
  }

  async updateLabCategory(id: number, data: Partial<InsertLabCategory>): Promise<LabCategory | undefined> {
    const [updated] = await db.update(labTestCategories).set(data).where(eq(labTestCategories.id, id)).returning();
    return updated;
  }

  async deleteLabCategory(id: number): Promise<void> {
    // Delete related tests first? Or rely on cascade (if set up)? SQLite/PG doesn't auto-cascade efficiently without FK constraints in schema definitions, which we have but let's be safe.
    // Actually, simple delete for now.
    await db.delete(labTestCategories).where(eq(labTestCategories.id, id));
  }

  async getLabTests(categoryId?: number): Promise<LabTest[]> {
    if (categoryId) {
      return db.select().from(labTests).where(eq(labTests.categoryId, categoryId)).orderBy(labTests.sortOrder, labTests.id);
    }
    return db.select().from(labTests).orderBy(labTests.categoryId, labTests.sortOrder);
  }

  async createLabTest(test: InsertLabTest): Promise<LabTest> {
    const [created] = await db.insert(labTests).values(test).returning();
    return created;
  }

  async updateLabTest(id: number, data: Partial<InsertLabTest>): Promise<LabTest | undefined> {
    const [updated] = await db.update(labTests).set(data).where(eq(labTests.id, id)).returning();
    return updated;
  }

  async deleteLabTest(id: number): Promise<void> {
    await db.delete(labTests).where(eq(labTests.id, id));
  }

  async getLabRefRanges(testId?: number): Promise<LabRefRange[]> {
    if (testId) {
      return db.select().from(labRefRanges).where(eq(labRefRanges.testId, testId));
    }
    return db.select().from(labRefRanges);
  }

  async createLabRefRange(range: InsertLabRefRange): Promise<LabRefRange> {
    const [created] = await db.insert(labRefRanges).values(range).returning();
    return created;
  }

  async updateLabRefRange(id: number, data: Partial<InsertLabRefRange>): Promise<LabRefRange | undefined> {
    const [updated] = await db.update(labRefRanges).set(data).where(eq(labRefRanges.id, id)).returning();
    return updated;
  }

  async deleteLabRefRange(id: number): Promise<void> {
    await db.delete(labRefRanges).where(eq(labRefRanges.id, id));
  }

  // Estimates
  async getEstimates(): Promise<Estimate[]> {
    return db.select().from(estimates).orderBy(desc(estimates.createdAt));
  }

  async getEstimate(id: number): Promise<Estimate | undefined> {
    const [est] = await db.select().from(estimates).where(eq(estimates.id, id));
    return est;
  }

  async createEstimate(est: InsertEstimate): Promise<Estimate> {
    let num = est.estimateNumber;
    if (!num) {
      num = await this.getAndIncrementNextEstimateNumber();
    }
    const [created] = await db.insert(estimates).values({ ...est, estimateNumber: num }).returning();
    return created;
  }

  async getAndIncrementNextEstimateNumber(): Promise<string> {
    return await db.transaction(async (tx) => {
      const [setting] = await tx
        .select()
        .from(clinicSettings)
        .where(eq(clinicSettings.settingKey, "next_estimate_number"))
        .for("update");

      const [prefixSetting] = await tx
        .select()
        .from(clinicSettings)
        .where(eq(clinicSettings.settingKey, "estimate_prefix"));
      const prefix = prefixSetting?.settingValue || "EST-";

      let nextNum: number;
      if (setting && setting.settingValue) {
        nextNum = parseInt(setting.settingValue);
      } else {
        const result = await tx.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(estimates);
        nextNum = (result[0]?.maxId || 0) + 1;
      }

      const formattedNumber = `${prefix}${String(nextNum).padStart(4, "0")}`;

      await tx
        .insert(clinicSettings)
        .values({ settingKey: "next_estimate_number", settingValue: String(nextNum + 1) })
        .onConflictDoUpdate({
          target: clinicSettings.settingKey,
          set: { settingValue: String(nextNum + 1) },
        });

      return formattedNumber;
    });
  }

  async updateEstimate(id: number, data: Partial<InsertEstimate>): Promise<Estimate | undefined> {
    const [updated] = await db.update(estimates).set(data).where(eq(estimates.id, id)).returning();
    return updated;
  }

  async deleteEstimate(id: number): Promise<void> {
    await db.delete(estimateItems).where(eq(estimateItems.estimateId, id));
    await db.delete(estimates).where(eq(estimates.id, id));
  }

  async getNextEstimateNumber(): Promise<string> {
    const setting = await this.getClinicSetting("next_estimate_number");
    const prefixSetting = await this.getClinicSetting("estimate_prefix");
    const prefix = prefixSetting?.settingValue || "EST-";
    
    let nextNum: number;
    if (setting && setting.settingValue) {
      nextNum = parseInt(setting.settingValue);
    } else {
      const result = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(estimates);
      nextNum = (result[0]?.maxId || 0) + 1;
    }
    return `${prefix}${String(nextNum).padStart(4, "0")}`;
  }

  async getEstimateItems(estimateId: number): Promise<EstimateItem[]> {
    return db.select().from(estimateItems).where(eq(estimateItems.estimateId, estimateId));
  }

  async createEstimateItem(item: InsertEstimateItem): Promise<EstimateItem> {
    const [created] = await db.insert(estimateItems).values(item).returning();
    return created;
  }

  async deleteEstimateItemsByEstimate(estimateId: number): Promise<void> {
    await db.delete(estimateItems).where(eq(estimateItems.estimateId, estimateId));
  }

  // Blood Smear Pathogens
  async getBloodSmearPathogens(speciesName?: string): Promise<BloodSmearPathogen[]> {
    if (speciesName) {
      return db.select().from(bloodSmearPathogens).where(ilike(bloodSmearPathogens.species, speciesName)).orderBy(bloodSmearPathogens.name);
    }
    return db.select().from(bloodSmearPathogens).orderBy(bloodSmearPathogens.species, bloodSmearPathogens.name);
  }

  async createBloodSmearPathogen(pathogen: InsertBloodSmearPathogen): Promise<BloodSmearPathogen> {
    const [created] = await db.insert(bloodSmearPathogens).values(pathogen).returning();
    return created;
  }

  async updateBloodSmearPathogen(id: number, data: Partial<InsertBloodSmearPathogen>): Promise<BloodSmearPathogen | undefined> {
    const [updated] = await db.update(bloodSmearPathogens).set(data).where(eq(bloodSmearPathogens.id, id)).returning();
    return updated;
  }

  async deleteBloodSmearPathogen(id: number): Promise<void> {
    await db.delete(bloodSmearPathogens).where(eq(bloodSmearPathogens.id, id));
  }

  async getTaxCategories(): Promise<TaxCategory[]> {
    return db.select().from(taxCategories).orderBy(taxCategories.name);
  }

  async createTaxCategory(data: InsertTaxCategory): Promise<TaxCategory> {
    const [created] = await db.insert(taxCategories).values(data).returning();
    return created;
  }

  async updateTaxCategory(id: number, data: Partial<InsertTaxCategory>): Promise<TaxCategory | undefined> {
    const [updated] = await db.update(taxCategories).set(data).where(eq(taxCategories.id, id)).returning();
    return updated;
  }

  async deleteTaxCategory(id: number): Promise<void> {
    await db.delete(taxCategories).where(eq(taxCategories.id, id));
  }

  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    return await db.select().from(expenseCategories).orderBy(expenseCategories.category);
  }

  async createExpenseCategory(data: InsertExpenseCategory): Promise<ExpenseCategory> {
    const [cat] = await db.insert(expenseCategories).values(data).returning();
    return cat;
  }

  async updateExpenseCategory(id: number, data: Partial<InsertExpenseCategory>): Promise<ExpenseCategory | undefined> {
    const [cat] = await db.update(expenseCategories).set(data).where(eq(expenseCategories.id, id)).returning();
    return cat;
  }

  async deleteExpenseCategory(id: number): Promise<void> {
    await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
  }

  // General Ledger
  async getLedgerEntries(filters?: { startDate?: string; endDate?: string; type?: string; search?: string }): Promise<LedgerEntry[]> {
    let query = db.select().from(ledgerEntries).$dynamic();
    
    if (filters) {
      const conditions = [];
      if (filters.startDate) conditions.push(gte(ledgerEntries.date, filters.startDate));
      if (filters.endDate) conditions.push(lte(ledgerEntries.date, filters.endDate));
      if (filters.type && filters.type !== "all") conditions.push(eq(ledgerEntries.type, filters.type));
      if (filters.search) {
        conditions.push(
          sql`${ledgerEntries.party} ILIKE ${'%' + filters.search + '%'} OR ${ledgerEntries.description} ILIKE ${'%' + filters.search + '%'} OR ${ledgerEntries.voucherNumber} ILIKE ${'%' + filters.search + '%'}`
        );
      }
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(ledgerEntries.date), desc(ledgerEntries.id));
  }

  async createLedgerEntry(entry: InsertLedgerEntry): Promise<LedgerEntry> {
    const [created] = await db.insert(ledgerEntries).values(entry).returning();
    return created;
  }

  async deleteLedgerEntry(id: number): Promise<void> {
    await db.delete(ledgerEntries).where(eq(ledgerEntries.id, id));
  }

  async getLedgerEntryByReference(type: string, id: number): Promise<LedgerEntry | undefined> {
    const [entry] = await db.select().from(ledgerEntries).where(
      and(eq(ledgerEntries.referenceType, type), eq(ledgerEntries.referenceId, id))
    );
    return entry;
  }

  async getNextVoucherNumber(type: string): Promise<string> {
    const prefix = type === "sale" ? "SL-" : type === "purchase" ? "PU-" : "EXP";
    const result = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(ledgerEntries);
    const nextNum = (result[0]?.maxId || 0) + 1;
    return `${prefix}${String(nextNum).padStart(4, "0")}`;
  }

  async getRevenueBreakdown(startDate: string, endDate: string): Promise<any> {
    const ipOp = await db.execute(sql`
      SELECT 
        i.invoice_type as label, 
        SUM(i.total::numeric) as value
      FROM invoices i
      WHERE i.date >= ${startDate} AND i.date <= ${endDate} 
        AND i.status != 'cancelled'
      GROUP BY i.invoice_type
    `);

    const itemTypes = await db.execute(sql`
      SELECT 
        CASE WHEN ii.fee_id IS NOT NULL THEN 'service' ELSE 'inventory' END as label,
        SUM(ii.total::numeric) as value
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE i.date >= ${startDate} AND i.date <= ${endDate} 
        AND i.status != 'cancelled'
      GROUP BY 1
    `);

    const serviceCats = await db.execute(sql`
      SELECT 
        COALESCE(fs.category, 'Uncategorized Service') as label,
        SUM(ii.total::numeric) as value
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN fee_structures fs ON ii.fee_id = fs.id
      WHERE i.date >= ${startDate} AND i.date <= ${endDate} 
        AND i.status != 'cancelled'
      GROUP BY 1
    `);

    const inventoryCats = await db.execute(sql`
      SELECT 
        COALESCE(itm.category, 'Uncategorized Item') as label,
        SUM(ii.total::numeric) as value
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN inventory_items itm ON ii.inventory_id = itm.id
      WHERE i.date >= ${startDate} AND i.date <= ${endDate} 
        AND i.status != 'cancelled'
      GROUP BY 1
    `);

    return {
      ipOp: ipOp.rows.map(r => ({ label: String(r.label).toUpperCase(), value: Number(r.value) })),
      itemTypes: itemTypes.rows.map(r => ({ label: String(r.label).charAt(0).toUpperCase() + String(r.label).slice(1), value: Number(r.value) })),
      serviceCats: serviceCats.rows.map(r => ({ label: String(r.label), value: Number(r.value) })),
      inventoryCats: inventoryCats.rows.map(r => ({ label: String(r.label), value: Number(r.value) }))
    };
  }
}

export const storage = new DatabaseStorage();
