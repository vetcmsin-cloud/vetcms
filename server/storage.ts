import {
  type Owner, type InsertOwner,
  type Pet, type InsertPet,
  type Appointment, type InsertAppointment,
  type MedicalRecord, type InsertMedicalRecord,
  type User, type InsertUser,
  owners, pets, appointments, medicalRecords, users,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
