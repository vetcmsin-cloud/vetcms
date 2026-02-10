import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import {
  insertOwnerSchema, insertPetSchema, insertAppointmentSchema,
  insertMedicalRecordSchema, insertUserSchema, insertRoleSchema,
  insertFeeStructureSchema, insertInvoiceSchema, insertInvoiceItemSchema,
} from "@shared/schema";
import { hashPassword, comparePassword, requireAuth, requireAdmin, requireRole, requirePermission } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await comparePassword(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    (req.session as any).userId = user.id;
    (req.session as any).userRole = user.role;

    const role = await storage.getRoleByName(user.role);
    const effectivePermissions = user.permissions || role?.permissions || [];

    const { password: _, ...safeUser } = user;

    req.session.save((err) => {
      if (err) return res.status(500).json({ message: "Session save failed" });
      res.json({ ...safeUser, effectivePermissions });
    });
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

    const role = await storage.getRoleByName(user.role);
    const effectivePermissions = user.permissions || role?.permissions || [];

    const { password: _, ...safeUser } = user;
    res.json({ ...safeUser, effectivePermissions });
  });

  // Users (permission-based)
  app.get("/api/users", requireAuth, requirePermission("user_management.view", "user_management.manage"), async (_req, res) => {
    const allUsers = await storage.getUsers();
    const safeUsers = allUsers.map(({ password: _, ...u }) => u);
    res.json(safeUsers);
  });

  app.post("/api/users", requireAuth, requirePermission("user_management.manage"), async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const existing = await storage.getUserByEmail(parsed.data.email);
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const hashedPassword = await hashPassword(parsed.data.password);
    const user = await storage.createUser({ ...parsed.data, password: hashedPassword });
    const { password: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  });

  app.patch("/api/users/:id", requireAuth, requirePermission("user_management.manage"), async (req, res) => {
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

  app.delete("/api/users/:id", requireAuth, requirePermission("user_management.manage"), async (req, res) => {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "superadmin") return res.status(403).json({ message: "Cannot delete super admin" });
    await storage.deleteUser(parseInt(req.params.id));
    res.status(204).send();
  });

  // Roles (permission-based)
  app.get("/api/roles", requireAuth, requirePermission("roles.manage"), async (_req, res) => {
    const allRoles = await storage.getRoles();
    res.json(allRoles);
  });

  app.post("/api/roles", requireAuth, requirePermission("roles.manage"), async (req, res) => {
    const parsed = insertRoleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const existing = await storage.getRoleByName(parsed.data.name);
    if (existing) return res.status(409).json({ message: "Role name already exists" });

    const role = await storage.createRole(parsed.data);
    res.status(201).json(role);
  });

  app.patch("/api/roles/:id", requireAuth, requirePermission("roles.manage"), async (req, res) => {
    const parsed = insertRoleSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const role = await storage.getRole(parseInt(req.params.id));
    if (!role) return res.status(404).json({ message: "Role not found" });

    const updated = await storage.updateRole(parseInt(req.params.id), parsed.data);
    res.json(updated);
  });

  app.delete("/api/roles/:id", requireAuth, requirePermission("roles.manage"), async (req, res) => {
    const role = await storage.getRole(parseInt(req.params.id));
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (role.isSystem === "true") return res.status(403).json({ message: "Cannot delete system role" });
    await storage.deleteRole(parseInt(req.params.id));
    res.status(204).send();
  });

  // Fee Structures (permission-based)
  app.get("/api/fee-structures", requireAuth, requirePermission("fee_structure.view", "fee_structure.manage", "billing.manage", "billing.view", "billing.create"), async (_req, res) => {
    const fees = await storage.getFeeStructures();
    res.json(fees);
  });

  app.post("/api/fee-structures", requireAuth, requirePermission("fee_structure.manage"), async (req, res) => {
    const parsed = insertFeeStructureSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const fee = await storage.createFeeStructure(parsed.data);
    res.status(201).json(fee);
  });

  app.patch("/api/fee-structures/:id", requireAuth, requirePermission("fee_structure.manage"), async (req, res) => {
    const parsed = insertFeeStructureSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateFeeStructure(parseInt(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Fee not found" });
    res.json(updated);
  });

  app.delete("/api/fee-structures/:id", requireAuth, requirePermission("fee_structure.manage"), async (req, res) => {
    await storage.deleteFeeStructure(parseInt(req.params.id));
    res.status(204).send();
  });

  // Invoices (permission-based)
  app.get("/api/invoices", requireAuth, requirePermission("billing.view", "billing.manage"), async (_req, res) => {
    const allInvoices = await storage.getInvoices();
    const allUsers = await storage.getUsers();
    const enriched = allInvoices.map((inv) => {
      const creator = inv.createdBy ? allUsers.find((u) => u.id === inv.createdBy) : null;
      return { ...inv, createdByName: creator?.name || "System" };
    });
    res.json(enriched);
  });

  app.get("/api/invoices/next-number", requireAuth, requirePermission("billing.view", "billing.manage", "billing.create"), async (_req, res) => {
    const nextNumber = await storage.getNextInvoiceNumber();
    res.json({ invoiceNumber: nextNumber });
  });

  app.get("/api/invoices/:id", requireAuth, requirePermission("billing.view", "billing.manage"), async (req, res) => {
    const invoice = await storage.getInvoice(parseInt(req.params.id));
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    const items = await storage.getInvoiceItems(invoice.id);
    const creator = invoice.createdBy ? await storage.getUser(invoice.createdBy) : null;
    res.json({ ...invoice, items, createdByName: creator?.name || "System" });
  });

  app.post("/api/invoices", requireAuth, requirePermission("billing.manage", "billing.create"), async (req, res) => {
    const { items, ...invoiceData } = req.body as any;
    const userId = (req.session as any).userId;
    const invoiceNumber = await storage.getNextInvoiceNumber();
    const dataWithMeta = { ...invoiceData, invoiceNumber, createdBy: userId, status: invoiceData.status || "pending" };
    const parsed = insertInvoiceSchema.safeParse(dataWithMeta);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const invoice = await storage.createInvoice(parsed.data);

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await storage.createInvoiceItem({
          ...item,
          invoiceId: invoice.id,
        });
      }
    }

    const createdItems = await storage.getInvoiceItems(invoice.id);
    const creator = invoice.createdBy ? await storage.getUser(invoice.createdBy) : null;
    res.status(201).json({ ...invoice, items: createdItems, createdByName: creator?.name || "System" });
  });

  app.patch("/api/invoices/:id", requireAuth, requirePermission("billing.manage", "billing.edit"), async (req, res) => {
    const { items, ...invoiceData } = req.body as any;
    const userId = (req.session as any).userId;

    const existing = await storage.getInvoice(parseInt(req.params.id));
    if (!existing) return res.status(404).json({ message: "Invoice not found" });

    const user = await storage.getUser(userId);
    if (user?.role === "pharmacy" && existing.status !== "forwarded") {
      return res.status(403).json({ message: "Pharmacy can only edit forwarded invoices" });
    }

    const parsed = insertInvoiceSchema.partial().safeParse(invoiceData);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const updated = await storage.updateInvoice(parseInt(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Invoice not found" });

    if (items && Array.isArray(items)) {
      await storage.deleteInvoiceItemsByInvoice(updated.id);
      for (const item of items) {
        await storage.createInvoiceItem({
          ...item,
          invoiceId: updated.id,
        });
      }
    }

    const updatedItems = await storage.getInvoiceItems(updated.id);
    const creator = updated.createdBy ? await storage.getUser(updated.createdBy) : null;
    res.json({ ...updated, items: updatedItems, createdByName: creator?.name || "System" });
  });

  app.delete("/api/invoices/:id", requireAuth, requirePermission("billing.manage", "billing.delete"), async (req, res) => {
    await storage.deleteInvoice(parseInt(req.params.id));
    res.status(204).send();
  });

  // Clinic Settings
  app.get("/api/clinic-settings", async (_req, res) => {
    const settings = await storage.getClinicSettings();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.settingKey] = s.settingValue;
    }
    res.json(map);
  });

  app.patch("/api/clinic-settings", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const body = req.body as Record<string, string>;
    const entries = Object.entries(body).map(([key, value]) => ({ key, value: String(value) }));
    if (entries.length === 0) return res.status(400).json({ message: "No settings provided" });
    await storage.upsertClinicSettings(entries);
    const allSettings = await storage.getClinicSettings();
    const map: Record<string, string> = {};
    for (const s of allSettings) {
      map[s.settingKey] = s.settingValue;
    }
    res.json(map);
  });

  // Backup Export (permission-based)
  app.get("/api/backup/export", requireAuth, requirePermission("backup.export"), async (_req, res) => {
    const [allOwners, allPets, allAppointments, allRecords, allFees, allInvoices, allRoles] = await Promise.all([
      storage.getOwners(),
      storage.getPets(),
      storage.getAppointments(),
      storage.getMedicalRecords(),
      storage.getFeeStructures(),
      storage.getInvoices(),
      storage.getRoles(),
    ]);

    const invoicesWithItems = await Promise.all(
      allInvoices.map(async (inv) => ({
        ...inv,
        items: await storage.getInvoiceItems(inv.id),
      }))
    );

    const backup = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      data: {
        owners: allOwners,
        pets: allPets,
        appointments: allAppointments,
        medicalRecords: allRecords,
        feeStructures: allFees,
        invoices: invoicesWithItems,
        roles: allRoles,
      },
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="petpoint-backup-${new Date().toISOString().split("T")[0]}.json"`);
    res.json(backup);
  });

  // Data Erasure (superadmin with data.erase permission only)
  app.delete("/api/data/medical-records", requireAuth, requirePermission("data.erase"), async (_req, res) => {
    const count = await storage.eraseAllMedicalRecords();
    res.json({ message: `Erased ${count} medical records`, count });
  });

  app.delete("/api/data/appointments", requireAuth, requirePermission("data.erase"), async (_req, res) => {
    const count = await storage.eraseAllAppointments();
    res.json({ message: `Erased ${count} appointments`, count });
  });

  app.delete("/api/data/pets", requireAuth, requirePermission("data.erase"), async (_req, res) => {
    const count = await storage.eraseAllPets();
    res.json({ message: `Erased all pets and related records`, count });
  });

  app.delete("/api/data/owners", requireAuth, requirePermission("data.erase"), async (_req, res) => {
    const count = await storage.eraseAllOwners();
    res.json({ message: `Erased all owners and related data`, count });
  });

  app.delete("/api/data/invoices", requireAuth, requirePermission("data.erase"), async (_req, res) => {
    const count = await storage.eraseAllInvoices();
    res.json({ message: `Erased ${count} invoices`, count });
  });

  app.delete("/api/data/all", requireAuth, requirePermission("data.erase"), async (_req, res) => {
    const result = await storage.eraseAllData();
    res.json({ message: "All clinic data erased", ...result });
  });

  app.get("/api/data/counts", requireAuth, requirePermission("data.erase"), async (_req, res) => {
    const [allOwners, allPets, allAppointments, allRecords, allInvoices] = await Promise.all([
      storage.getOwners(),
      storage.getPets(),
      storage.getAppointments(),
      storage.getMedicalRecords(),
      storage.getInvoices(),
    ]);
    res.json({
      owners: allOwners.length,
      pets: allPets.length,
      appointments: allAppointments.length,
      medicalRecords: allRecords.length,
      invoices: allInvoices.length,
    });
  });

  // All data routes below require authentication
  app.use("/api/owners" as string, requireAuth);
  app.use("/api/pets" as string, requireAuth);
  app.use("/api/appointments" as string, requireAuth);
  app.use("/api/medical-records" as string, requireAuth, requirePermission("medical_records.view", "medical_records.manage", "medical_records.create", "medical_records.delete"));

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
