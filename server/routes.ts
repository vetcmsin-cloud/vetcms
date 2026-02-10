import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertOwnerSchema, insertPetSchema, insertAppointmentSchema, insertMedicalRecordSchema, insertUserSchema } from "@shared/schema";
import { hashPassword, comparePassword, requireAuth, requireAdmin, requireRole } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await comparePassword(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    (req.session as any).userId = user.id;
    (req.session as any).userRole = user.role;

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Failed to logout" });
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!(req.session as any).userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser((req.session as any).userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // Users (admin only for management)
  app.get("/api/users", requireAuth, requireAdmin, async (_req, res) => {
    const allUsers = await storage.getUsers();
    const safeUsers = allUsers.map(({ password: _, ...u }) => u);
    res.json(safeUsers);
  });

  app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const existing = await storage.getUserByEmail(parsed.data.email);
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const hashedPassword = await hashPassword(parsed.data.password);
    const user = await storage.createUser({ ...parsed.data, password: hashedPassword });
    const { password: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  });

  app.patch("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    const parsed = insertUserSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const data = { ...parsed.data };
    if (data.password) {
      data.password = await hashPassword(data.password);
    }

    const updated = await storage.updateUser(parseInt(req.params.id), data);
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  });

  app.delete("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "superadmin") return res.status(403).json({ message: "Cannot delete super admin" });
    await storage.deleteUser(parseInt(req.params.id));
    res.status(204).send();
  });

  // All routes below require authentication
  app.use("/api/owners" as string, requireAuth);
  app.use("/api/pets" as string, requireAuth);
  app.use("/api/appointments" as string, requireAuth);
  app.use("/api/medical-records" as string, requireRole("superadmin", "doctor"));

  // Owners
  app.get("/api/owners", async (_req, res) => {
    const allOwners = await storage.getOwners();
    res.json(allOwners);
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
