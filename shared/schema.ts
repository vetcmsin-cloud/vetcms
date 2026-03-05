import { sql } from "drizzle-orm";
import { pgTable, text, integer, decimal, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { timestamp } from "drizzle-orm/pg-core";

export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""), // Added phone field
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  permissions: jsonb("permissions").$type<string[]>(),
});

export const owners = pgTable("owners", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
});

export const pets = pgTable("pets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  species: text("species").notNull(),
  breed: text("breed"),
  age: integer("age").notNull(),
  ageMonths: integer("age_months").default(0),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  gender: text("gender").notNull().default("Male"),
  color: text("color"),
  microchip: text("microchip"),
  imageUrl: text("image_url"),
  ownerId: integer("owner_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().$defaultFn(() => new Date()),
});

export const appointments = pgTable("appointments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  petId: integer("pet_id").notNull(),
  ownerId: integer("owner_id").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
});

export const medicalRecords = pgTable("medical_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  petId: integer("pet_id").notNull(),
  appointmentId: integer("appointment_id"),
  date: text("date").notNull(),
  diagnosis: text("diagnosis").notNull(),
  treatment: text("treatment").notNull(),
  prescription: text("prescription"),
  veterinarian: text("veterinarian").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roles = pgTable("roles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().$type<string[]>().default([]),
  isSystem: text("is_system").notNull().default("false"),
});

export const feeStructures = pgTable("fee_structures", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  isActive: text("is_active").notNull().default("true"),
});

export const invoices = pgTable("invoices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  ownerId: integer("owner_id").notNull(),
  petId: integer("pet_id"),
  date: text("date").notNull(),
  dueDate: text("due_date"),
  status: text("status").notNull().default("pending"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  billedBy: integer("billed_by"),
  clinicName: text("clinic_name").default("PetPoint Pro Veterinary Clinic"),
  clinicAddress: text("clinic_address"),
  clinicPhone: text("clinic_phone"),
  forwardedTo: text("forwarded_to"),
  paymentMethod: text("payment_method"),  // cash | upi | card | cheque | other
  invoiceType: text("invoice_type").default("ip"),  // ip | op
  opOwnerName: text("op_owner_name"),     // free-text for OP patients
  opPetName: text("op_pet_name"),         // free-text for OP patients
});

export const invoiceItems = pgTable("invoice_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: integer("invoice_id").notNull(),
  feeId: integer("fee_id"),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

// ---------- Estimates (standalone, no owner FK) ----------
export const estimates = pgTable("estimates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  estimateNumber: text("estimate_number").notNull().unique(),
  clientName: text("client_name").notNull(),      // free-text, no owner FK
  petName: text("pet_name"),
  date: text("date").notNull(),
  status: text("status").notNull().default("draft"),  // draft | finalized | converted
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  convertedInvoiceId: integer("converted_invoice_id"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const estimateItems = pgTable("estimate_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  estimateId: integer("estimate_id").notNull(),
  feeId: integer("fee_id"),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

export const insertUserSchema = createInsertSchema(users, {
  permissions: z.array(z.string()).nullable().optional(),
  phone: z.string().min(1, "Phone number is required")
});
export const insertOwnerSchema = createInsertSchema(owners);
export const insertPetSchema = createInsertSchema(pets);
export const insertAppointmentSchema = createInsertSchema(appointments);
export const insertMedicalRecordSchema = createInsertSchema(medicalRecords, {
  diagnosis: z.string().default(""),
  treatment: z.string().default(""),
});
export const insertRoleSchema = createInsertSchema(roles, { permissions: z.array(z.string()) });
export const insertFeeStructureSchema = createInsertSchema(feeStructures);
export const insertInvoiceSchema = createInsertSchema(invoices);
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems);
export const insertEstimateSchema = createInsertSchema(estimates);
export const insertEstimateItemSchema = createInsertSchema(estimateItems);

export const clinicSettings = pgTable("clinic_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull().default(""),
});

export const insertClinicSettingSchema = createInsertSchema(clinicSettings);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;
export type Pet = typeof pets.$inferSelect;
export type InsertPet = z.infer<typeof insertPetSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type FeeStructure = typeof feeStructures.$inferSelect;
export type InsertFeeStructure = z.infer<typeof insertFeeStructureSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type ClinicSetting = typeof clinicSettings.$inferSelect;
export type InsertClinicSetting = z.infer<typeof insertClinicSettingSchema>;
export type Estimate = typeof estimates.$inferSelect;
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type EstimateItem = typeof estimateItems.$inferSelect;
export type InsertEstimateItem = z.infer<typeof insertEstimateItemSchema>;



// Suppliers
export const suppliers = pgTable("suppliers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().$defaultFn(() => new Date()),
});

export const inventoryItems = pgTable("inventory_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  description: text("description"),
  category: text("category").default("General"),
  quantity: integer("quantity").notNull().default(0),
  minQuantity: integer("min_quantity").notNull().default(5),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull().default("0"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull().default("0"),
  expiryDate: text("expiry_date"),
  batchNumber: text("batch_number"),
  supplier: text("supplier"),
  supplierId: integer("supplier_id"),
  lastUpdated: text("last_updated").notNull(),
});

// Purchase Orders
export const purchaseOrders = pgTable("purchase_orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderNumber: text("order_number").notNull().unique(),
  supplierId: integer("supplier_id").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  receivedDate: text("received_date"),
  createdBy: integer("created_by"),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  purchaseOrderId: integer("purchase_order_id").notNull(),
  inventoryItemId: integer("inventory_item_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

export const expenses = pgTable("expenses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: text("date").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  paymentMethod: text("payment_method").notNull(),
  notes: text("notes"),
  recordedBy: integer("recorded_by"),
});

export const insertSupplierSchema = createInsertSchema(suppliers);
export const insertInventoryItemSchema = createInsertSchema(inventoryItems);
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders);
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems);
export const insertExpenseSchema = createInsertSchema(expenses);

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export const INVENTORY_CATEGORIES = [
  "Medicines",
  "Surgical",
  "Consumables",
  "Lab",
  "Equipment",
  "General",
  "Other",
] as const;

export const labReports = pgTable("lab_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  petId: integer("pet_id").notNull(),
  date: text("date").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  result: text("result"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  fileUrl: text("file_url"),
  details: jsonb("details").$type<HematologyData | BloodChemistryData | BiochemistryData>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLabReportSchema = createInsertSchema(labReports);
export type LabReport = typeof labReports.$inferSelect;
export type InsertLabReport = z.infer<typeof insertLabReportSchema>;

export interface HematologyData {
  rbc?: string;
  hb?: string;
  pcv?: string;
  wbc?: string;
  platelet?: string;
  mcv?: string;
  mch?: string;
  mchc?: string;
  neutrophils?: string;
  lymphocytes?: string;
  monocytes?: string;
  eosinophils?: string;
  basophils?: string;
}

export interface BloodChemistryData {
  glucose?: string;
  urea?: string;
  creatinine?: string;
  alt?: string;
  ast?: string;
  alp?: string;
  totalProtein?: string;
  albumin?: string;
  globulin?: string;
  totalBilirubin?: string;
  sodium?: string;
  potassium?: string;
  chloride?: string;
  calcium?: string;
  phosphorus?: string;
}

export interface BiochemistryData {
  bio_glucose?: string;
  bio_urea?: string;
  bio_creatinine?: string;
  bio_alt?: string;
  bio_ast?: string;
  bio_alp?: string;
  bio_totalProtein?: string;
  bio_albumin?: string;
  bio_globulin?: string;
  bio_totalBilirubin?: string;
  bio_sodium?: string;
  bio_potassium?: string;
  bio_chloride?: string;
  bio_calcium?: string;
  bio_phosphorus?: string;
}

export const LAB_REPORT_CATEGORIES = [
  "Hematology", // Merged with CBC Panel
  "Biochemistry", // Merged with Biochemistry Panel
  "Urinalysis",
  "Faecal Sample", // Merged with Faecal Panel
  "Imaging",
  "Rapid Tests",
  "Microbiology",
  "Endocrine",
  "Reproductive"
] as const;

export const activityLogs = pgTable("activity_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id"),
  userName: text("user_name").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs);
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export const petDocuments = pgTable("pet_documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  petId: integer("pet_id").notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  category: text("category").default("General"),
  notes: text("notes"),
  uploadedBy: integer("uploaded_by"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertPetDocumentSchema = createInsertSchema(petDocuments);
export type PetDocument = typeof petDocuments.$inferSelect;
export type InsertPetDocument = z.infer<typeof insertPetDocumentSchema>;

export const DOCUMENT_CATEGORIES = [
  "General",
  "Vaccination",
  "Prescription",
  "Lab Result",
  "X-Ray",
  "Surgery",
  "Insurance",
  "Other",
] as const;

export const ALL_PERMISSIONS = [
  "dashboard.view",
  "patients.view",
  "patients.create",
  "patients.edit",
  "patients.delete",
  "owners.view",
  "owners.create",
  "owners.edit",
  "owners.delete",
  "appointments.view",
  "appointments.create",
  "appointments.edit",
  "appointments.delete",
  "medical_records.view",
  "medical_records.create",
  "medical_records.delete",
  "billing.view",
  "billing.create",
  "billing.edit",
  "billing.delete",
  "fee_structure.view",
  "fee_structure.manage",
  "user_management.view",
  "user_management.manage",
  "roles.manage",
  "backup.export",
  "admin_dashboard.view",
  "data.erase",
  "inventory.view",
  "inventory.manage",
  "accounts.view",
  "accounts.manage",
  "activity_log.view",
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

export const labTestCategories = pgTable("lab_test_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "CBC Panel", "Biochemistry Panel"
  description: text("description"),
});

export const labTests = pgTable("lab_tests", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(), // e.g., "Hemoglobin", "Color"
  section: text("section"), // e.g., "Physical", "Chemical" (Grouping)
  unit: text("unit"), // e.g., "g/dL", "/HPF"
  sortOrder: integer("sort_order").default(0),
});

export const species = pgTable("species", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const labRefRanges = pgTable("lab_ref_ranges", {
  id: serial("id").primaryKey(),
  testId: integer("test_id").notNull(),
  species: text("species").notNull(), // "Canine", "Feline"
  breed: text("breed"), // Specific breed or null for all
  min: text("min"),
  max: text("max"),
  refText: text("ref_text"), // For text-based ranges like "Negative"
});

export const insertLabCategorySchema = createInsertSchema(labTestCategories);
export type InsertLabCategory = z.infer<typeof insertLabCategorySchema>;
export type LabCategory = typeof labTestCategories.$inferSelect;

export const insertLabTestSchema = createInsertSchema(labTests);
export type InsertLabTest = z.infer<typeof insertLabTestSchema>;
export type LabTest = typeof labTests.$inferSelect;

export const insertSpeciesSchema = createInsertSchema(species);
export const insertLabRefRangeSchema = createInsertSchema(labRefRanges);
export type InsertLabRefRange = z.infer<typeof insertLabRefRangeSchema>;
export type Species = typeof species.$inferSelect;
export type InsertSpecies = z.infer<typeof insertSpeciesSchema>;
export type LabRefRange = typeof labRefRanges.$inferSelect;

