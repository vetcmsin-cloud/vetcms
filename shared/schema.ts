import { sql } from "drizzle-orm";
import { pgTable, text, integer, decimal, jsonb, serial, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { timestamp } from "drizzle-orm/pg-core";

export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const tenants = pgTable("tenants", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"),
  plan: text("plan").notNull().default("standard"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  isDemo: boolean("is_demo").notNull().default(false),
  demoUntil: timestamp("demo_until"),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const platformAdmins = pgTable("platform_admins", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const platformClinicPayments = pgTable("platform_clinic_payments", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  method: text("method").notNull(),
  status: text("status").notNull().default("paid"),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  reference: text("reference"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  notes: text("notes"),
  recordedBy: integer("recorded_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""), // Added phone field
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  permissions: jsonb("permissions").$type<string[]>(),
});

export const owners = pgTable("owners", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
});

export const pets = pgTable("pets", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
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
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
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
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
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
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().$type<string[]>().default([]),
  isSystem: text("is_system").notNull().default("false"),
}, (table) => [uniqueIndex("roles_name_tenant_unique").on(table.tenantId, table.name)]);

export const feeStructures = pgTable("fee_structures", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  productCode: text("product_code"),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  isActive: text("is_active").notNull().default("true"),
});

export const invoices = pgTable("invoices", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceNumber: text("invoice_number").notNull(),
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
  createdAt: timestamp("created_at").defaultNow().$defaultFn(() => new Date()),
}, (table) => [uniqueIndex("invoices_invoice_number_tenant_unique").on(table.tenantId, table.invoiceNumber)]);

export const invoiceItems = pgTable("invoice_items", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: integer("invoice_id").notNull(),
  feeId: integer("fee_id"),
  inventoryId: integer("inventory_id"),
  productCode: text("product_code"),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

// ---------- Estimates (standalone, no owner FK) ----------
export const estimates = pgTable("estimates", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  estimateNumber: text("estimate_number").notNull(),
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
}, (table) => [uniqueIndex("estimates_estimate_number_tenant_unique").on(table.tenantId, table.estimateNumber)]);

export const estimateItems = pgTable("estimate_items", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  estimateId: integer("estimate_id").notNull(),
  feeId: integer("fee_id"),
  inventoryId: integer("inventory_id"),
  productCode: text("product_code"),
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
export const insertInvoiceSchema = createInsertSchema(invoices, {
  invoiceNumber: z.string().optional(),
});
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems);
export const insertEstimateSchema = createInsertSchema(estimates, {
  estimateNumber: z.string().optional(),
});
export const insertEstimateItemSchema = createInsertSchema(estimateItems);

export const clinicSettings = pgTable("clinic_settings", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  settingKey: text("setting_key").notNull(),
  settingValue: text("setting_value").notNull().default(""),
}, (table) => [uniqueIndex("clinic_settings_setting_key_tenant_unique").on(table.tenantId, table.settingKey)]);

export const insertClinicSettingSchema = createInsertSchema(clinicSettings);

export const taxCategories = pgTable("tax_categories", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  purchaseSgst: decimal("purchase_sgst", { precision: 5, scale: 2 }).notNull().default("0"),
  salesSgst: decimal("sales_sgst", { precision: 5, scale: 2 }).notNull().default("0"),
  purchaseCgst: decimal("purchase_cgst", { precision: 5, scale: 2 }).notNull().default("0"),
  salesCgst: decimal("sales_cgst", { precision: 5, scale: 2 }).notNull().default("0"),
  purchaseIgst: decimal("purchase_igst", { precision: 5, scale: 2 }).notNull().default("0"),
  salesIgst: decimal("sales_igst", { precision: 5, scale: 2 }).notNull().default("0"),
});

export const insertTaxCategorySchema = createInsertSchema(taxCategories);

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



export const suppliers = pgTable("suppliers", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().$defaultFn(() => new Date()),
});

export const inventoryUnits = pgTable("inventory_units", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
}, (table) => [uniqueIndex("inventory_units_name_tenant_unique").on(table.tenantId, table.name)]);

export const inventoryCategories = pgTable("inventory_categories", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
}, (table) => [uniqueIndex("inventory_categories_name_tenant_unique").on(table.tenantId, table.name)]);

export const inventorySubCategories = pgTable("inventory_sub_categories", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  categoryId: integer("category_id"),
  category: text("category").default("General"),
}, (table) => [uniqueIndex("inventory_sub_categories_name_tenant_unique").on(table.tenantId, table.name)]);

export const inventoryProductTypes = pgTable("inventory_product_types", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
}, (table) => [uniqueIndex("inventory_product_types_name_tenant_unique").on(table.tenantId, table.name)]);

export const inventoryItems = pgTable("inventory_items", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  productId: text("product_id"),
  name: text("name").notNull(),
  sku: text("sku").notNull(),
  description: text("description"),
  category: text("category").default("General"),
  subCategory: text("sub_category"),
  productType: text("product_type").default("Medicine"),
  baseUnit: text("base_unit").default("Unit"),
  multiUnit: jsonb("multi_unit").$type<{ name: string; conversion: number }[]>(),
  quantity: integer("quantity").notNull().default(0),
  minQuantity: integer("min_quantity").notNull().default(5),
  mrp: decimal("mrp", { precision: 10, scale: 2 }).notNull().default("0"),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull().default("0"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull().default("0"),
  expiryDate: text("expiry_date"),
  batchNumber: text("batch_number"),
  supplier: text("supplier"),
  supplierId: integer("supplier_id"),
  minSellingPrice: decimal("min_selling_price", { precision: 10, scale: 2 }).default("0"),
  taxCategoryId: integer("tax_category_id"),
  purchaseSgstAmount: decimal("purchase_sgst_amount", { precision: 10, scale: 2 }).default("0"),
  purchaseCgstAmount: decimal("purchase_cgst_amount", { precision: 10, scale: 2 }).default("0"),
  saleSgstAmount: decimal("sale_sgst_amount", { precision: 10, scale: 2 }).default("0"),
  saleCgstAmount: decimal("sale_cgst_amount", { precision: 10, scale: 2 }).default("0"),
  batchCriteria: text("batch_criteria"),
  mfgDate: text("mfg_date"),
  shelfDetails: text("shelf_details"),
  lastUpdated: text("last_updated").notNull(),
}, (table) => [uniqueIndex("inventory_items_product_id_tenant_unique").on(table.tenantId, table.productId)]);

// Purchase Orders
export const purchaseOrders = pgTable("purchase_orders", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderNumber: text("order_number").notNull(),
  supplierId: integer("supplier_id").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  receivedDate: text("received_date"),
  createdBy: integer("created_by"),
}, (table) => [uniqueIndex("purchase_orders_order_number_tenant_unique").on(table.tenantId, table.orderNumber)]);

export const purchaseOrderItems = pgTable("purchase_order_items", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  purchaseOrderId: integer("purchase_order_id").notNull(),
  inventoryItemId: integer("inventory_item_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  mrp: decimal("mrp", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  sgstRate: decimal("sgst_rate", { precision: 5, scale: 2 }).default("0"),
  cgstRate: decimal("cgst_rate", { precision: 5, scale: 2 }).default("0"),
  sgstAmount: decimal("sgst_amount", { precision: 10, scale: 2 }).default("0"),
  cgstAmount: decimal("cgst_amount", { precision: 10, scale: 2 }).default("0"),
  unit: text("unit").default("Unit"),
});

// Purchases (Purchase Invoices)
export const purchases = pgTable("purchases", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  purchaseNumber: text("purchase_number").notNull(), // e.g., PINV-001
  orderId: integer("order_id"), // Optional FK to purchase_orders if converted
  supplierId: integer("supplier_id").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().default("completed"), // completed | cancelled
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  referenceNumber: text("reference_number"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().$defaultFn(() => new Date()),
}, (table) => [uniqueIndex("purchases_purchase_number_tenant_unique").on(table.tenantId, table.purchaseNumber)]);

export const purchaseItems = pgTable("purchase_items", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  purchaseId: integer("purchase_id").notNull(),
  inventoryItemId: integer("inventory_item_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  mrp: decimal("mrp", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  sgstRate: decimal("sgst_rate", { precision: 5, scale: 2 }).default("0"),
  cgstRate: decimal("cgst_rate", { precision: 5, scale: 2 }).default("0"),
  sgstAmount: decimal("sgst_amount", { precision: 10, scale: 2 }).default("0"),
  cgstAmount: decimal("cgst_amount", { precision: 10, scale: 2 }).default("0"),
  unit: text("unit").default("Unit"),
});


export const expenses = pgTable("expenses", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  date: text("date").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxPercentage: decimal("tax_percentage", { precision: 5, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  category: text("category").notNull(),
  subCategory: text("sub_category"),
  paymentMethod: text("payment_method").notNull(),
  vendorId: integer("vendor_id"),
  invoiceNumber: text("invoice_number"),
  attachmentUrl: text("attachment_url"),
  paidById: integer("paid_by_id"),
  notes: text("notes"),
  recordedBy: integer("recorded_by"),
  voucherNumber: text("voucher_number"),
});

export const expenseCategories = pgTable("expense_categories", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  category: text("category").notNull(),
  subCategory: text("sub_category").notNull(),
  description: text("description"),
});

export const insertSupplierSchema = createInsertSchema(suppliers);
export const insertInventoryUnitSchema = createInsertSchema(inventoryUnits);
export const insertInventoryCategorySchema = createInsertSchema(inventoryCategories);
export const insertInventorySubCategorySchema = createInsertSchema(inventorySubCategories);
export const insertInventoryProductTypeSchema = createInsertSchema(inventoryProductTypes);
export const insertInventoryItemSchema = createInsertSchema(inventoryItems, {
  multiUnit: z.array(z.object({ 
    name: z.string(), 
    conversion: z.number(),
    salePrice: z.union([z.string(), z.number()]).optional(),
    purchasePrice: z.union([z.string(), z.number()]).optional(),
    mrp: z.union([z.string(), z.number()]).optional()
  })).optional().nullable()
}).omit({ id: true, lastUpdated: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders, {
  orderNumber: z.string().optional(),
});
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems);
export const insertPurchaseSchema = createInsertSchema(purchases, {
  purchaseNumber: z.string().optional(),
});
export const insertPurchaseItemSchema = createInsertSchema(purchaseItems);
export const insertExpenseSchema = createInsertSchema(expenses);
export const insertExpenseCategorySchema = createInsertSchema(expenseCategories);

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InventoryUnit = typeof inventoryUnits.$inferSelect;
export type InsertInventoryUnit = z.infer<typeof insertInventoryUnitSchema>;
export type InventoryCategory = typeof inventoryCategories.$inferSelect;
export type InsertInventoryCategory = z.infer<typeof insertInventoryCategorySchema>;
export type InventorySubCategory = typeof inventorySubCategories.$inferSelect;
export type InsertInventorySubCategory = z.infer<typeof insertInventorySubCategorySchema>;
export type InventoryProductType = typeof inventoryProductTypes.$inferSelect;
export type InsertInventoryProductType = z.infer<typeof insertInventoryProductTypeSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type TaxCategory = typeof taxCategories.$inferSelect;
export type InsertTaxCategory = z.infer<typeof insertTaxCategorySchema>;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;

export const labReports = pgTable("lab_reports", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
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
  bloodSmear?: string;
  wetFilm?: string;
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
  "Ultrasonography",
  "Rapid Tests",
  "Microbiology",
  "Endocrine",
  "Reproductive"
] as const;

export const activityLogs = pgTable("activity_logs", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
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
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
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
  "purchase.view",
  "purchase.create",
  "purchase.edit",
  "purchase.delete",
  "purchase.manage",
  "reports.view",
  "accounts.view",
  "accounts.manage",
  "activity_log.view",
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

export const labTestCategories = pgTable("lab_test_categories", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "CBC Panel", "Biochemistry Panel"
  description: text("description"),
});

export const labTests = pgTable("lab_tests", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(), // e.g., "Hemoglobin", "Color"
  section: text("section"), // e.g., "Physical", "Chemical" (Grouping)
  unit: text("unit"), // e.g., "g/dL", "/HPF"
  sortOrder: integer("sort_order").default(0),
});

export const species = pgTable("species", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
}, (table) => [uniqueIndex("species_name_tenant_unique").on(table.tenantId, table.name)]);

export const labRefRanges = pgTable("lab_ref_ranges", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
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

export const bloodSmearPathogens = pgTable("blood_smear_pathogens", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: serial("id").primaryKey(),
  species: text("species").notNull(), // "Canine", "Feline", etc.
  name: text("name").notNull(), // Pathogen name
});

export const insertBloodSmearPathogenSchema = createInsertSchema(bloodSmearPathogens);
export type BloodSmearPathogen = typeof bloodSmearPathogens.$inferSelect;
export type InsertBloodSmearPathogen = z.infer<typeof insertBloodSmearPathogenSchema>;

// General Ledger

export const ledgerEntries = pgTable("ledger_entries", {
  tenantId: integer("tenant_id").notNull().default(sql`NULLIF(current_setting('app.tenant_id', true), '')::integer`),
  id: serial("id").primaryKey(),
  date: text("date").notNull(),                          // YYYY-MM-DD
  voucherNumber: text("voucher_number").notNull(),       // auto: SL-0001, PU-0001, EX-0001
  type: text("type").notNull(),                          // "sale" | "purchase" | "expense"
  category: text("category").notNull(),                  // fee category / expense category / inventory product type
  description: text("description").notNull(),            // human readable
  party: text("party"),                                  // owner name / supplier name
  referenceType: text("reference_type"),                 // "invoice" | "purchase_order" | "expense"
  referenceId: integer("reference_id"),                  // FK to source record
  referenceNumber: text("reference_number"),             // e.g., "#PET-0042" or "PO-001"
  debitAmount: decimal("debit_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  creditAmount: decimal("credit_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method"),                 // cash / upi / card / cheque
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow().$defaultFn(() => new Date()),
});

export const insertLedgerEntrySchema = createInsertSchema(ledgerEntries).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;

// Public Secure Shortened Report Shares (Unguessable short tokens for pet parents)
export const publicReportShares = pgTable("public_report_shares", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),           // Secure unguessable token e.g. "aB3x9kLq"
  filename: text("filename").notNull(),              // PDF filename on disk
  ownerPhone: text("owner_phone"),
  petName: text("pet_name"),
  reportTitle: text("report_title"),
  createdAt: timestamp("created_at").defaultNow().$defaultFn(() => new Date()),
});

export const insertPublicReportShareSchema = createInsertSchema(publicReportShares);
export type InsertPublicReportShare = z.infer<typeof insertPublicReportShareSchema>;
export type PublicReportShare = typeof publicReportShares.$inferSelect;
