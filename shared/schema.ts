import { sql } from "drizzle-orm";
import { pgTable, text, integer, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("receptionist"),
  permissions: jsonb("permissions").$type<string[]>(),
});

export const owners = pgTable("owners", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
});

export const pets = pgTable("pets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  species: text("species").notNull(),
  breed: text("breed").notNull(),
  age: integer("age").notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  gender: text("gender").notNull(),
  color: text("color"),
  microchip: text("microchip"),
  imageUrl: text("image_url"),
  ownerId: integer("owner_id").notNull(),
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
  clinicName: text("clinic_name").default("PetPoint Pro Veterinary Clinic"),
  clinicAddress: text("clinic_address"),
  clinicPhone: text("clinic_phone"),
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

export const insertUserSchema = createInsertSchema(users).omit({ id: true as const });
export const insertOwnerSchema = createInsertSchema(owners).omit({ id: true as const });
export const insertPetSchema = createInsertSchema(pets).omit({ id: true as const });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true as const });
export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).omit({ id: true as const });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true as const });
export const insertFeeStructureSchema = createInsertSchema(feeStructures).omit({ id: true as const });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true as const });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true as const });

export const clinicSettings = pgTable("clinic_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull().default(""),
});

export const insertClinicSettingSchema = createInsertSchema(clinicSettings).omit({ id: true as const });

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
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];
