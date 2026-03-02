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
  owners, pets, appointments, medicalRecords, users,
  roles, feeStructures, invoices, invoiceItems, clinicSettings,
  inventoryItems, expenses, suppliers, purchaseOrders, purchaseOrderItems,
  activityLogs, petDocuments,
  type LabReport, type InsertLabReport, labReports,
  type LabCategory, type InsertLabCategory, labTestCategories,
  type LabTest, type InsertLabTest, labTests,
  type LabRefRange, type InsertLabRefRange, labRefRanges,
  type Species, type InsertSpecies, species,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, lte, desc, and, gte } from "drizzle-orm";

export interface IStorage {
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;

  getOwners(): Promise<Owner[]>;
  getOwner(id: number): Promise<Owner | undefined>;
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
  eraseAllData(): Promise<{ medicalRecords: number; appointments: number; invoiceItems: number; invoices: number; pets: number; owners: number; labReports: number }>;

  getInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: number): Promise<void>;

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

  // Pet Documents
  getPetDocuments(petId: number): Promise<PetDocument[]>;
  createPetDocument(doc: InsertPetDocument): Promise<PetDocument>;
  deletePetDocument(id: number): Promise<void>;

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
    return db.select().from(owners);
  }

  async getOwner(id: number): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, id));
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
    return db.select().from(pets);
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
    return db.select().from(invoices);
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    return created;
  }

  async updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getNextInvoiceNumber(): Promise<string> {
    const result = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(invoices);
    const nextNum = (result[0]?.maxId || 0) + 1;
    return `#PET-${String(nextNum).padStart(4, "0")}`;
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
        target: clinicSettings.settingKey,
        set: { settingValue: value },
      })
      .returning();
    return result;
  }

  async upsertClinicSettings(settings: { key: string; value: string }[]): Promise<ClinicSetting[]> {
    const results: ClinicSetting[] = [];
    for (const s of settings) {
      const result = await this.upsertClinicSetting(s.key, s.value);
      results.push(result);
    }
    return results;
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

  async eraseAllData(): Promise<{ medicalRecords: number; appointments: number; invoiceItems: number; invoices: number; pets: number; owners: number; labReports: number }> {
    const [recs, apts, items, invs, allPets, allOwners, allLabReports] = await Promise.all([
      db.select().from(medicalRecords),
      db.select().from(appointments),
      db.select().from(invoiceItems),
      db.select().from(invoices),
      db.select().from(pets),
      db.select().from(owners),
      db.select().from(labReports),
    ]);
    await db.delete(labReports);
    await db.delete(medicalRecords);
    await db.delete(appointments);
    await db.delete(invoiceItems);
    await db.delete(invoices);
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
    };
  }

  async getInventoryItems(): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems);
  }

  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [created] = await db.insert(inventoryItems).values(item).returning();
    return created;
  }

  async updateInventoryItem(id: number, data: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
    const [updated] = await db.update(inventoryItems).set(data).where(eq(inventoryItems.id, id)).returning();
    return updated;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
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
    return db.select().from(labReports).where(eq(labReports.petId, petId));
  }

  async createLabReport(report: InsertLabReport): Promise<LabReport> {
    const [created] = await db.insert(labReports).values(report).returning();
    return created;
  }

  async getAllLabReports(): Promise<LabReport[]> {
    return db.select().from(labReports).orderBy(desc(labReports.date));
  }

  async updateLabReport(id: number, data: Partial<InsertLabReport>): Promise<LabReport | undefined> {
    const [updated] = await db.update(labReports).set(data).where(eq(labReports.id, id)).returning();
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
    const [created] = await db.insert(purchaseOrders).values(order).returning();
    return created;
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
}

export const storage = new DatabaseStorage();
