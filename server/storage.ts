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
  owners, pets, appointments, medicalRecords, users,
  roles, feeStructures, invoices, invoiceItems,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

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

  eraseAllMedicalRecords(): Promise<number>;
  eraseAllAppointments(): Promise<number>;
  eraseAllPets(): Promise<number>;
  eraseAllOwners(): Promise<number>;
  eraseAllInvoices(): Promise<number>;
  eraseAllData(): Promise<{ medicalRecords: number; appointments: number; invoiceItems: number; invoices: number; pets: number; owners: number }>;
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

  async eraseAllData(): Promise<{ medicalRecords: number; appointments: number; invoiceItems: number; invoices: number; pets: number; owners: number }> {
    const [recs, apts, items, invs, allPets, allOwners] = await Promise.all([
      db.select().from(medicalRecords),
      db.select().from(appointments),
      db.select().from(invoiceItems),
      db.select().from(invoices),
      db.select().from(pets),
      db.select().from(owners),
    ]);
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
    };
  }
}

export const storage = new DatabaseStorage();
