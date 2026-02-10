import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOwnerSchema, insertPetSchema, insertAppointmentSchema, insertMedicalRecordSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Owners
  app.get("/api/owners", async (_req, res) => {
    const owners = await storage.getOwners();
    res.json(owners);
  });

  app.get("/api/owners/:id", async (req, res) => {
    const owner = await storage.getOwner(parseInt(req.params.id));
    if (!owner) return res.status(404).json({ message: "Owner not found" });
    res.json(owner);
  });

  app.post("/api/owners", async (req, res) => {
    const parsed = insertOwnerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const owner = await storage.createOwner(parsed.data);
    res.status(201).json(owner);
  });

  app.patch("/api/owners/:id", async (req, res) => {
    const parsed = insertOwnerSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateOwner(parseInt(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Owner not found" });
    res.json(updated);
  });

  app.delete("/api/owners/:id", async (req, res) => {
    await storage.deleteOwner(parseInt(req.params.id));
    res.status(204).send();
  });

  // Pets
  app.get("/api/pets", async (_req, res) => {
    const allPets = await storage.getPets();
    res.json(allPets);
  });

  app.get("/api/pets/:id", async (req, res) => {
    const pet = await storage.getPet(parseInt(req.params.id));
    if (!pet) return res.status(404).json({ message: "Pet not found" });
    res.json(pet);
  });

  app.post("/api/pets", async (req, res) => {
    const parsed = insertPetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const pet = await storage.createPet(parsed.data);
    res.status(201).json(pet);
  });

  app.patch("/api/pets/:id", async (req, res) => {
    const parsed = insertPetSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updatePet(parseInt(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Pet not found" });
    res.json(updated);
  });

  app.delete("/api/pets/:id", async (req, res) => {
    await storage.deletePet(parseInt(req.params.id));
    res.status(204).send();
  });

  // Appointments
  app.get("/api/appointments", async (_req, res) => {
    const allAppointments = await storage.getAppointments();
    res.json(allAppointments);
  });

  app.get("/api/appointments/:id", async (req, res) => {
    const appointment = await storage.getAppointment(parseInt(req.params.id));
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    res.json(appointment);
  });

  app.post("/api/appointments", async (req, res) => {
    const parsed = insertAppointmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const appointment = await storage.createAppointment(parsed.data);
    res.status(201).json(appointment);
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    const parsed = insertAppointmentSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateAppointment(parseInt(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Appointment not found" });
    res.json(updated);
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    await storage.deleteAppointment(parseInt(req.params.id));
    res.status(204).send();
  });

  // Medical Records
  app.get("/api/medical-records", async (_req, res) => {
    const records = await storage.getMedicalRecords();
    res.json(records);
  });

  app.get("/api/medical-records/:id", async (req, res) => {
    const record = await storage.getMedicalRecord(parseInt(req.params.id));
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json(record);
  });

  app.post("/api/medical-records", async (req, res) => {
    const parsed = insertMedicalRecordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const record = await storage.createMedicalRecord(parsed.data);
    res.status(201).json(record);
  });

  app.delete("/api/medical-records/:id", async (req, res) => {
    await storage.deleteMedicalRecord(parseInt(req.params.id));
    res.status(204).send();
  });

  return httpServer;
}
