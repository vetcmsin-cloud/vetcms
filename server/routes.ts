import express, { type Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import {
  insertOwnerSchema, insertPetSchema, insertAppointmentSchema,
  insertMedicalRecordSchema, insertUserSchema, insertRoleSchema,
  insertFeeStructureSchema, insertInvoiceSchema, insertInvoiceItemSchema,
  insertInventoryItemSchema, insertExpenseSchema, insertClinicSettingSchema,
  insertLabReportSchema,
  insertLabCategorySchema, insertLabTestSchema, insertLabRefRangeSchema, insertSpeciesSchema,
  insertSupplierSchema, insertPurchaseOrderSchema, insertPurchaseOrderItemSchema,
} from "@shared/schema";
import { hashPassword, comparePassword, requireAuth, requireAdmin, requireRole, requirePermission } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.resolve(process.cwd(), "server", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage: fileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Separate multer for SQL backup file uploads
const sqlUpload = multer({
  storage: fileStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".sql") {
      cb(null, true);
    } else {
      cb(new Error("Only .sql files are allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use("/uploads", express.static(uploadsDir));

  // --- Activity Log Helper ---
  async function logActivity(req: express.Request, action: string, entityType: string, entityId?: number, details?: string) {
    try {
      const userId = (req.session as any)?.userId || null;
      const user = userId ? await storage.getUser(userId) : null;
      await storage.createActivityLog({
        userId,
        userName: user?.name || "System",
        action,
        entityType,
        entityId: entityId ?? null,
        details: details || null,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
      });
    } catch (e) {
      // Never let logging failures break the app
      console.error("Activity log error:", e);
    }
  }

  app.post("/api/upload", requireAuth, requirePermission("admin_dashboard.view"), upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  });

  app.post("/api/upload/patient-photo", requireAuth, requirePermission("patients.edit"), upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    const petId = req.body.petId;
    if (!petId || isNaN(parseInt(String(petId)))) {
      return res.status(400).json({ message: "Valid petId is required" });
    }
    const pet = await storage.getPet(parseInt(String(petId)));
    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }
    await storage.updatePet(parseInt(String(petId)), { imageUrl: url });
    res.json({ url, filename: req.file.filename });
  });

  app.delete("/api/upload/:filename", requireAuth, requirePermission("admin_dashboard.view"), (req, res) => {
    const filename = String(req.params.filename);
    if (filename.includes("..") || filename.includes("/")) {
      return res.status(400).json({ message: "Invalid filename" });
    }
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json({ message: "File deleted" });
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: "Invalid request body" });
    }
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await comparePassword(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    (req.session as any).userId = user.id;
    (req.session as any).userRole = user.role;

    const role = await storage.getRoleByName(user.role);
    const effectivePermissions = (user.permissions && user.permissions.length > 0)
      ? user.permissions
      : (role?.permissions || []);

    const { password: _, ...safeUser } = user;

    req.session.save((err) => {
      if (err) return res.status(500).json({ message: "Session save failed" });
      logActivity(req, "LOGIN", "Auth", user.id, `User "${user.name}" logged in`);
      res.json({ ...safeUser, effectivePermissions });
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    const userId = (req.session as any)?.userId;
    logActivity(req, "LOGOUT", "Auth", userId, "User logged out");
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
    const effectivePermissions = (user.permissions && user.permissions.length > 0)
      ? user.permissions
      : (role?.permissions || []);

    const { password: _, ...safeUser } = user;
    res.json({ ...safeUser, effectivePermissions });
  });

  // Users (permission-based)
  app.get("/api/users", requireAuth, requirePermission("user_management.view", "user_management.manage"), async (req, res) => {
    const currentUserId = parseInt(String((req.session as any).userId));
    const currentUser = await storage.getUser(currentUserId);
    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    const allUsers = await storage.getUsers();

    // Filter out superadmin users if requesting user is not superadmin
    let visibleUsers = allUsers;
    // Debug logging
    console.log(`[API] currentUser.role: '${currentUser.role}'`);
    if (currentUser.role.toLowerCase() !== "superadmin") {
      visibleUsers = allUsers.filter(u => u.role.toLowerCase() !== "superadmin");
      console.log(`[API] Filter applied. Count: ${visibleUsers.length}`);
    } else {
      console.log("[API] Superadmin access granted.");
    }

    const safeUsers = visibleUsers.map(({ password: _, ...u }) => u);
    res.json(safeUsers);
  });

  app.post("/api/users", requireAuth, requirePermission("user_management.manage"), async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    // Security check: Only superadmin can create superadmin
    if (parsed.data.role === "superadmin") {
      const currentUserId = parseInt(String((req.session as any).userId));
      const currentUser = await storage.getUser(currentUserId);
      if (!currentUser || currentUser.role !== "superadmin") {
        return res.status(403).json({ message: "Only Super Admin can create Super Admin accounts" });
      }
    }

    const existing = await storage.getUserByEmail(parsed.data.email);
    if (existing) return res.status(409).json({ message: "Email already in use" });

    const hashedPassword = await hashPassword(parsed.data.password);
    const user = await storage.createUser({ ...parsed.data, password: hashedPassword });
    const { password: _, ...safeUser } = user;
    logActivity(req, "CREATE", "User", user.id, `Created user "${user.name}"`);
    res.status(201).json(safeUser);
  });

  app.patch("/api/users/:id", requireAuth, requirePermission("user_management.manage"), async (req, res) => {
    const parsed = insertUserSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const userId = parseInt(String(req.params.id));
    const targetUser = await storage.getUser(userId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Fetch current user from DB to ensure up-to-date role (avoid stale session)
    const currentUserId = (req.session as any).userId;
    const currentUser = await storage.getUser(currentUserId);

    if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

    // Security check: Only superadmin can modify superadmin
    if (targetUser.role === "superadmin" && currentUser.role !== "superadmin") {
      return res.status(403).json({ message: "Insufficient permissions to modify Super Admin" });
    }

    const data = { ...parsed.data };

    // Security check: Prevent role escalation
    if (data.role === "superadmin" && currentUser.role !== "superadmin") {
      return res.status(403).json({ message: "Only Super Admin can assign Super Admin role" });
    }

    if (data.password) {
      data.password = await hashPassword(data.password);
    }

    const updated = await storage.updateUser(userId, data);
    // updated is guaranteed to be defined because we checked targetUser exists, 
    // unless it was deleted concurrently, but updateUser returns undefined then.
    if (!updated) return res.status(404).json({ message: "User not found" });

    const { password: _, ...safeUser } = updated;
    logActivity(req, "UPDATE", "User", updated.id, `Updated user "${updated.name}"`);
    res.json(safeUser);
  });

  app.delete("/api/users/:id", requireAuth, requirePermission("user_management.manage"), async (req, res) => {
    const user = await storage.getUser(parseInt(String(req.params.id)));
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "superadmin") return res.status(403).json({ message: "Cannot delete super admin" });
    await storage.deleteUser(parseInt(String(req.params.id)));
    logActivity(req, "DELETE", "User", user.id, `Deleted user "${user.name}"`);
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
    logActivity(req, "CREATE", "Role", role.id, `Created role "${role.name}"`);
    res.status(201).json(role);
  });

  app.patch("/api/roles/:id", requireAuth, requirePermission("roles.manage"), async (req, res) => {
    const parsed = insertRoleSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const role = await storage.getRole(parseInt(String(req.params.id)));
    if (!role) return res.status(404).json({ message: "Role not found" });

    const updated = await storage.updateRole(parseInt(String(req.params.id)), parsed.data);
    logActivity(req, "UPDATE", "Role", updated?.id, `Updated role "${updated?.name}"`);
    res.json(updated);
  });

  app.delete("/api/roles/:id", requireAuth, requirePermission("roles.manage"), async (req, res) => {
    const role = await storage.getRole(parseInt(String(req.params.id)));
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (role.isSystem) return res.status(403).json({ message: "Cannot delete system role" });
    await storage.deleteRole(parseInt(String(req.params.id)));
    logActivity(req, "DELETE", "Role", role.id, `Deleted role "${role.name}"`);
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
    logActivity(req, "CREATE", "Fee Structure", fee.id, `Created fee "${fee.name}"`);
    res.status(201).json(fee);
  });

  app.patch("/api/fee-structures/:id", requireAuth, requirePermission("fee_structure.manage"), async (req, res) => {
    const parsed = insertFeeStructureSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateFeeStructure(parseInt(String(req.params.id)), parsed.data);
    if (!updated) return res.status(404).json({ message: "Fee not found" });
    logActivity(req, "UPDATE", "Fee Structure", updated.id, `Updated fee "${updated.name}"`);
    res.json(updated);
  });

  app.delete("/api/fee-structures/:id", requireAuth, requirePermission("fee_structure.manage"), async (req, res) => {
    logActivity(req, "DELETE", "Fee Structure", parseInt(String(req.params.id)), "Deleted fee structure");
    await storage.deleteFeeStructure(parseInt(String(req.params.id)));
    res.status(204).send();
  });

  // Invoices (permission-based)
  app.get("/api/invoices", requireAuth, requirePermission("billing.view", "billing.manage"), async (_req, res) => {
    const allInvoices = await storage.getInvoices();
    const allUsers = await storage.getUsers();
    const enriched = allInvoices.map((inv) => {
      const creator = inv.createdBy ? allUsers.find((u) => u.id === inv.createdBy) : null;
      const biller = inv.billedBy ? allUsers.find((u) => u.id === inv.billedBy) : null;
      return {
        ...inv,
        createdByName: creator?.name || "System",
        createdByPhone: creator?.phone || "",
        billedByName: biller?.name || ""
      };
    });
    res.json(enriched);
  });

  app.get("/api/invoices/next-number", requireAuth, requirePermission("billing.view", "billing.manage", "billing.create"), async (_req, res) => {
    const nextNumber = await storage.getNextInvoiceNumber();
    res.json({ invoiceNumber: nextNumber });
  });

  app.get("/api/invoices/:id", requireAuth, requirePermission("billing.view", "billing.manage"), async (req, res) => {
    const invoice = await storage.getInvoice(parseInt(String(req.params.id)));
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    const items = await storage.getInvoiceItems(invoice.id);
    const creator = invoice.createdBy ? await storage.getUser(invoice.createdBy) : null;
    const biller = invoice.billedBy ? await storage.getUser(invoice.billedBy) : null;
    res.json({ ...invoice, items, createdByName: creator?.name || "System", createdByPhone: creator?.phone || "", billedByName: biller?.name || "" });
  });

  app.post("/api/invoices", requireAuth, requirePermission("billing.manage", "billing.create"), async (req, res) => {
    const { items, ...invoiceData } = req.body as any;
    const userId = (req.session as any).userId;
    const invoiceNumber = await storage.getNextInvoiceNumber();
    const dataWithMeta = { ...invoiceData, invoiceNumber, createdBy: userId, status: invoiceData.status || "pending" };
    // If saving direct as paid
    if (dataWithMeta.status === "paid" && !dataWithMeta.billedBy) {
      dataWithMeta.billedBy = userId;
    }
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
    const biller = invoice.billedBy ? await storage.getUser(invoice.billedBy) : null;
    logActivity(req, "CREATE", "Invoice", invoice.id, `Created invoice #${invoice.invoiceNumber}`);
    res.status(201).json({ ...invoice, items: createdItems, createdByName: creator?.name || "System", createdByPhone: creator?.phone || "", billedByName: biller?.name || "" });
  });

  app.post("/api/invoices/:id/mark-paid", requireAuth, requirePermission("billing.view"), async (req, res) => {
    const invoiceId = parseInt(String(req.params.id));
    const userId = (req.session as any).userId;
    const existing = await storage.getInvoice(invoiceId);
    if (!existing) return res.status(404).json({ message: "Invoice not found" });

    if (existing.status !== "pending" && existing.status !== "forwarded") {
      return res.status(400).json({ message: "Only pending or forwarded invoices can be marked as paid" });
    }

    const updated = await storage.updateInvoice(invoiceId, { status: "paid", billedBy: userId });
    if (!updated) return res.status(404).json({ message: "Invoice not found" });
    logActivity(req, "MARK_PAID", "Invoice", invoiceId, `Marked invoice #${existing.invoiceNumber} as paid`);

    const items = await storage.getInvoiceItems(updated.id);
    const creator = updated.createdBy ? await storage.getUser(updated.createdBy) : null;
    const biller = updated.billedBy ? await storage.getUser(updated.billedBy) : null;
    res.json({ ...updated, items, createdByName: creator?.name || "System", createdByPhone: creator?.phone || "", billedByName: biller?.name || "" });
  });

  app.patch("/api/invoices/:id", requireAuth, requirePermission("billing.manage", "billing.edit"), async (req, res) => {
    const { items, ...invoiceData } = req.body as any;
    const userId = (req.session as any).userId;

    const existing = await storage.getInvoice(parseInt(String(req.params.id)));
    if (!existing) return res.status(404).json({ message: "Invoice not found" });

    const user = await storage.getUser(userId);
    if (user?.role === "pharmacy" && existing.status !== "forwarded") {
      return res.status(403).json({ message: "Pharmacy can only edit forwarded invoices" });
    }

    const parsed = insertInvoiceSchema.partial().safeParse(invoiceData);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const updated = await storage.updateInvoice(parseInt(String(req.params.id)), parsed.data);
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
    logActivity(req, "UPDATE", "Invoice", updated!.id, `Updated invoice #${updated!.invoiceNumber}`);
    res.json({ ...updated, items: updatedItems, createdByName: creator?.name || "System", createdByPhone: creator?.phone || "" });
  });

  app.delete("/api/invoices/:id", requireAuth, requirePermission("billing.manage", "billing.delete"), async (req, res) => {
    logActivity(req, "DELETE", "Invoice", parseInt(String(req.params.id)), "Deleted invoice");
    await storage.deleteInvoice(parseInt(String(req.params.id)));
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
    logActivity(req, "UPDATE", "Clinic Settings", undefined, `Updated settings: ${entries.map(e => e.key).join(", ")}`);
    const allSettings = await storage.getClinicSettings();
    const map: Record<string, string> = {};
    for (const s of allSettings) {
      map[s.settingKey] = s.settingValue;
    }
    res.json(map);
  });

  // Backup Export (permission-based)
  app.get("/api/backup/export", requireAuth, requirePermission("backup.export"), async (_req, res) => {
    const [allOwners, allPets, allAppointments, allRecords, allFees, allInvoices, allRoles, allLabReports, allSettings, allInventory, allExpenses, allSuppliers, allPurchaseOrders] = await Promise.all([
      storage.getOwners(),
      storage.getPets(),
      storage.getAppointments(),
      storage.getMedicalRecords(),
      storage.getFeeStructures(),
      storage.getInvoices(),
      storage.getRoles(),
      storage.getAllLabReports(),
      storage.getClinicSettings(),
      storage.getInventoryItems(),
      storage.getExpenses(),
      storage.getSuppliers(),
      storage.getPurchaseOrders(),
    ]);

    const invoicesWithItems = await Promise.all(
      allInvoices.map(async (inv) => ({
        ...inv,
        items: await storage.getInvoiceItems(inv.id),
      }))
    );

    const purchaseOrdersWithItems = await Promise.all(
      allPurchaseOrders.map(async (po) => ({
        ...po,
        items: await storage.getPurchaseOrderItems(po.id),
      }))
    );

    const settingsMap: Record<string, string> = {};
    for (const s of allSettings) {
      settingsMap[s.settingKey] = s.settingValue;
    }

    const backup = {
      exportDate: new Date().toISOString(),
      version: "2.0",
      data: {
        owners: allOwners,
        pets: allPets,
        appointments: allAppointments,
        medicalRecords: allRecords,
        feeStructures: allFees,
        invoices: invoicesWithItems,
        roles: allRoles,
        labReports: allLabReports,
        clinicSettings: settingsMap,
        inventoryItems: allInventory,
        expenses: allExpenses,
        suppliers: allSuppliers,
        purchaseOrders: purchaseOrdersWithItems,
      },
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="petpoint-backup-${new Date().toISOString().split("T")[0]}.json"`);
    res.json(backup);
  });

  // SQL Backup Export (pg_dump)
  app.get("/api/backup/export-sql", requireAuth, requirePermission("data.erase"), async (req, res) => {
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) return res.status(500).json({ message: "DATABASE_URL not configured" });

      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      // Parse DATABASE_URL for pg_dump
      const url = new URL(dbUrl);
      const env = {
        ...process.env,
        PGPASSWORD: url.password,
      };

      const host = url.hostname;
      const port = url.port || "5432";
      const dbName = url.pathname.slice(1);
      const user = url.username;

      const { stdout } = await execAsync(
        `pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} --no-owner --no-acl --clean --if-exists`,
        { env, maxBuffer: 100 * 1024 * 1024 }
      );

      const filename = `petpoint-backup-${new Date().toISOString().split("T")[0]}.sql`;
      res.setHeader("Content-Type", "application/sql");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      logActivity(req, "EXPORT", "Backup SQL", undefined, "Exported SQL backup");
      res.send(stdout);
    } catch (error: any) {
      console.error("SQL export error:", error);
      res.status(500).json({ message: `SQL export failed: ${error.message}` });
    }
  });

  // SQL Backup Restore (psql)
  app.post("/api/backup/restore-sql", requireAuth, requirePermission("data.erase"), sqlUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No SQL file uploaded" });

      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) return res.status(500).json({ message: "DATABASE_URL not configured" });

      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const fs = await import("fs");
      const execAsync = promisify(exec);

      const url = new URL(dbUrl);
      const env = {
        ...process.env,
        PGPASSWORD: url.password,
      };

      const host = url.hostname;
      const port = url.port || "5432";
      const dbName = url.pathname.slice(1);
      const user = url.username;

      // Read uploaded SQL file
      const sqlContent = fs.readFileSync(req.file.path, "utf-8");

      // Write to temp file for psql
      const tmpFile = `/tmp/petpoint_restore_${Date.now()}.sql`;
      fs.writeFileSync(tmpFile, sqlContent);

      try {
        const { stdout, stderr } = await execAsync(
          `psql -h ${host} -p ${port} -U ${user} -d ${dbName} -f ${tmpFile}`,
          { env, maxBuffer: 100 * 1024 * 1024 }
        );

        // Clean up temp file
        fs.unlinkSync(tmpFile);
        // Also clean up uploaded file
        fs.unlinkSync(req.file.path);

        logActivity(req, "RESTORE", "Backup SQL", undefined, "Restored SQL backup");
        res.json({
          message: "SQL backup restored successfully",
          details: stderr ? stderr.split("\n").filter((l: string) => l.trim()).slice(-5) : []
        });
      } catch (execError: any) {
        // Clean up files even on error
        try { fs.unlinkSync(tmpFile); } catch { }
        try { if (req.file) fs.unlinkSync(req.file.path); } catch { }
        throw execError;
      }
    } catch (error: any) {
      console.error("SQL restore error:", error);
      res.status(500).json({ message: `SQL restore failed: ${error.stderr || error.message}` });
    }
  });

  // Backup Restore (superadmin only)
  app.post("/api/backup/restore", requireAuth, requirePermission("data.erase"), async (req, res) => {
    try {
      const backup = req.body;
      if (!backup || !backup.data) {
        return res.status(400).json({ message: "Invalid backup file format" });
      }

      const data = backup.data;
      const counts: Record<string, number> = {};

      // Clear existing data (order matters due to foreign keys)
      await storage.eraseAllLabReports();
      await storage.eraseAllData(); // clears medical records, appointments, invoice items, invoices, pets, owners

      // Also clear other tables
      const allInventory = await storage.getInventoryItems();
      for (const item of allInventory) await storage.deleteInventoryItem(item.id);

      const allExpenses = await storage.getExpenses();
      for (const exp of allExpenses) await storage.deleteExpense(exp.id);

      const allSuppliers = await storage.getSuppliers();
      for (const s of allSuppliers) await storage.deleteSupplier(s.id);

      const allPOs = await storage.getPurchaseOrders();
      for (const po of allPOs) await storage.deletePurchaseOrder(po.id);

      const allFees = await storage.getFeeStructures();
      for (const f of allFees) await storage.deleteFeeStructure(f.id);

      // Restore roles (skip system roles that exist)
      if (data.roles && Array.isArray(data.roles)) {
        for (const role of data.roles) {
          const existing = await storage.getRoleByName(role.name);
          if (!existing) {
            await storage.createRole({ name: role.name, permissions: role.permissions || [], isSystem: role.isSystem || false });
          }
        }
        counts.roles = data.roles.length;
      }

      // Restore owners
      if (data.owners && Array.isArray(data.owners)) {
        for (const owner of data.owners) {
          const { id, createdAt, ...ownerData } = owner;
          await storage.createOwner(ownerData);
        }
        counts.owners = data.owners.length;
      }

      // Restore pets (need to map owner IDs)
      if (data.pets && Array.isArray(data.pets)) {
        const newOwners = await storage.getOwners();
        for (const pet of data.pets) {
          const { id, createdAt, ...petData } = pet;
          // Try to match owner by name/phone from backup
          const originalOwner = data.owners?.find((o: any) => o.id === pet.ownerId);
          if (originalOwner) {
            const matchedOwner = newOwners.find(o => o.firstName === originalOwner.firstName && o.lastName === originalOwner.lastName && o.phone === originalOwner.phone);
            if (matchedOwner) {
              petData.ownerId = matchedOwner.id;
            }
          }
          await storage.createPet(petData);
        }
        counts.pets = data.pets.length;
      }

      // Restore appointments
      if (data.appointments && Array.isArray(data.appointments)) {
        const newPets = await storage.getPets();
        const newOwners = await storage.getOwners();
        for (const apt of data.appointments) {
          const { id, ...aptData } = apt;
          // Remap petId
          const originalPet = data.pets?.find((p: any) => p.id === apt.petId);
          if (originalPet) {
            const matched = newPets.find(p => p.name === originalPet.name && p.species === originalPet.species);
            if (matched) aptData.petId = matched.id;
          }
          // Remap ownerId
          const originalOwner = data.owners?.find((o: any) => o.id === apt.ownerId);
          if (originalOwner) {
            const matched = newOwners.find(o => o.firstName === originalOwner.firstName && o.lastName === originalOwner.lastName);
            if (matched) aptData.ownerId = matched.id;
          }
          await storage.createAppointment(aptData);
        }
        counts.appointments = data.appointments.length;
      }

      // Restore medical records
      if (data.medicalRecords && Array.isArray(data.medicalRecords)) {
        const newPets = await storage.getPets();
        for (const rec of data.medicalRecords) {
          const { id, createdAt, ...recData } = rec;
          const originalPet = data.pets?.find((p: any) => p.id === rec.petId);
          if (originalPet) {
            const matched = newPets.find(p => p.name === originalPet.name && p.species === originalPet.species);
            if (matched) recData.petId = matched.id;
          }
          await storage.createMedicalRecord(recData);
        }
        counts.medicalRecords = data.medicalRecords.length;
      }

      // Restore fee structures
      if (data.feeStructures && Array.isArray(data.feeStructures)) {
        for (const fee of data.feeStructures) {
          const { id, ...feeData } = fee;
          await storage.createFeeStructure(feeData);
        }
        counts.feeStructures = data.feeStructures.length;
      }

      // Restore invoices
      if (data.invoices && Array.isArray(data.invoices)) {
        const newOwners = await storage.getOwners();
        const newPets = await storage.getPets();
        for (const inv of data.invoices) {
          const { id, items, createdByName, ...invData } = inv;
          // Remap ownerId
          const originalOwner = data.owners?.find((o: any) => o.id === inv.ownerId);
          if (originalOwner) {
            const matched = newOwners.find(o => o.firstName === originalOwner.firstName && o.lastName === originalOwner.lastName);
            if (matched) invData.ownerId = matched.id;
          }
          // Remap petId  
          if (inv.petId) {
            const originalPet = data.pets?.find((p: any) => p.id === inv.petId);
            if (originalPet) {
              const matched = newPets.find(p => p.name === originalPet.name && p.species === originalPet.species);
              if (matched) invData.petId = matched.id;
            }
          }
          const newInv = await storage.createInvoice(invData);
          if (items && Array.isArray(items)) {
            for (const item of items) {
              const { id: itemId, ...itemData } = item;
              await storage.createInvoiceItem({ ...itemData, invoiceId: newInv.id });
            }
          }
        }
        counts.invoices = data.invoices.length;
      }

      // Restore lab reports
      if (data.labReports && Array.isArray(data.labReports)) {
        const newPets = await storage.getPets();
        for (const report of data.labReports) {
          const { id, createdAt, ...reportData } = report;
          const originalPet = data.pets?.find((p: any) => p.id === report.petId);
          if (originalPet) {
            const matched = newPets.find(p => p.name === originalPet.name && p.species === originalPet.species);
            if (matched) reportData.petId = matched.id;
          }
          await storage.createLabReport(reportData);
        }
        counts.labReports = data.labReports.length;
      }

      // Restore clinic settings
      if (data.clinicSettings && typeof data.clinicSettings === "object") {
        const entries = Object.entries(data.clinicSettings).map(([key, value]) => ({ key, value: String(value) }));
        if (entries.length > 0) {
          await storage.upsertClinicSettings(entries);
          counts.clinicSettings = entries.length;
        }
      }

      // Restore inventory
      if (data.inventoryItems && Array.isArray(data.inventoryItems)) {
        for (const item of data.inventoryItems) {
          const { id, ...itemData } = item;
          await storage.createInventoryItem(itemData);
        }
        counts.inventoryItems = data.inventoryItems.length;
      }

      // Restore expenses
      if (data.expenses && Array.isArray(data.expenses)) {
        for (const exp of data.expenses) {
          const { id, ...expData } = exp;
          await storage.createExpense(expData);
        }
        counts.expenses = data.expenses.length;
      }

      // Restore suppliers
      if (data.suppliers && Array.isArray(data.suppliers)) {
        for (const s of data.suppliers) {
          const { id, ...sData } = s;
          await storage.createSupplier(sData);
        }
        counts.suppliers = data.suppliers.length;
      }

      // Restore purchase orders
      if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
        for (const po of data.purchaseOrders) {
          const { id, items, ...poData } = po;
          const newPO = await storage.createPurchaseOrder(poData);
          if (items && Array.isArray(items)) {
            for (const item of items) {
              const { id: itemId, ...itemData } = item;
              await storage.createPurchaseOrderItem({ ...itemData, purchaseOrderId: newPO.id });
            }
          }
        }
        counts.purchaseOrders = data.purchaseOrders.length;
      }

      logActivity(req, "RESTORE", "Backup", undefined, `Restored backup from ${backup.exportDate || 'unknown date'}`);
      res.json({ message: "Backup restored successfully", counts });
    } catch (error: any) {
      console.error("Backup restore error:", error);
      res.status(500).json({ message: `Restore failed: ${error.message}` });
    }
  });

  // Data Erasure (superadmin with data.erase permission only)
  app.delete("/api/data/medical-records", requireAuth, requirePermission("data.erase"), async (req, res) => {
    const count = await storage.eraseAllMedicalRecords();
    logActivity(req, "ERASE", "Medical Records", undefined, `Erased ${count} medical records`);
    res.json({ message: `Erased ${count} medical records`, count });
  });

  app.delete("/api/data/appointments", requireAuth, requirePermission("data.erase"), async (req, res) => {
    const count = await storage.eraseAllAppointments();
    logActivity(req, "ERASE", "Appointments", undefined, `Erased ${count} appointments`);
    res.json({ message: `Erased ${count} appointments`, count });
  });

  app.delete("/api/data/pets", requireAuth, requirePermission("data.erase"), async (req, res) => {
    const count = await storage.eraseAllPets();
    logActivity(req, "ERASE", "Pets", undefined, `Erased all pets and related records`);
    res.json({ message: `Erased all pets and related records`, count });
  });

  app.delete("/api/data/owners", requireAuth, requirePermission("data.erase"), async (req, res) => {
    const count = await storage.eraseAllOwners();
    logActivity(req, "ERASE", "Owners", undefined, `Erased all owners and related data`);
    res.json({ message: `Erased all owners and related data`, count });
  });

  app.delete("/api/data/invoices", requireAuth, requirePermission("data.erase"), async (req, res) => {
    const count = await storage.eraseAllInvoices();
    logActivity(req, "ERASE", "Invoices", undefined, `Erased ${count} invoices`);
    res.json({ message: `Erased ${count} invoices`, count });
  });

  app.delete("/api/data/lab-reports", requireAuth, requirePermission("data.erase"), async (req, res) => {
    const count = await storage.eraseAllLabReports();
    logActivity(req, "ERASE", "Lab Reports", undefined, `Erased ${count} lab reports`);
    res.json({ message: `Erased ${count} lab reports`, count });
  });

  app.delete("/api/data/all", requireAuth, requirePermission("data.erase"), async (req, res) => {
    const result = await storage.eraseAllData();
    logActivity(req, "ERASE", "All Data", undefined, "Erased all clinic data");
    res.json({ message: "All clinic data erased", ...result });
  });

  app.get("/api/data/counts", requireAuth, requirePermission("data.erase"), async (_req, res) => {
    const [allOwners, allPets, allAppointments, allRecords, allInvoices, allLabReports] = await Promise.all([
      storage.getOwners(),
      storage.getPets(),
      storage.getAppointments(),
      storage.getMedicalRecords(),
      storage.getInvoices(),
      storage.getAllLabReports(),
    ]);
    res.json({
      owners: allOwners.length,
      pets: allPets.length,
      appointments: allAppointments.length,
      medicalRecords: allRecords.length,
      invoices: allInvoices.length,
      labReports: allLabReports.length,
    });
  });

  app.get("/api/admin/stats", requireAuth, requirePermission("admin_dashboard.view"), async (_req, res) => {
    const [allInvoices, allUsers] = await Promise.all([
      storage.getInvoices(),
      storage.getUsers(),
    ]);

    const totalRevenue = allInvoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + parseFloat(String(inv.total)), 0);

    const pendingInvoices = allInvoices.filter((inv) => inv.status === "pending").length;

    res.json({
      totalRevenue,
      totalUsers: allUsers.length,
      pendingInvoices,
    });
  });


  // --- Inventory Routes ---
  app.get("/api/inventory", requireAuth, requirePermission("inventory.view"), async (_req, res) => {
    const items = await storage.getInventoryItems();
    res.json(items);
  });

  app.post("/api/inventory", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const data = insertInventoryItemSchema.parse(req.body);
    const item = await storage.createInventoryItem(data);
    logActivity(req, "CREATE", "Inventory", item.id, `Added inventory item "${item.name}"`);
    res.status(201).json(item);
  });

  app.patch("/api/inventory/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    const data = insertInventoryItemSchema.partial().parse(req.body);
    const updated = await storage.updateInventoryItem(id, data);
    logActivity(req, "UPDATE", "Inventory", id, `Updated inventory item "${updated?.name}"`);
    res.json(updated);
  });

  app.delete("/api/inventory/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    logActivity(req, "DELETE", "Inventory", id, "Deleted inventory item");
    await storage.deleteInventoryItem(id);
    res.sendStatus(204);
  });

  // --- Low Stock ---
  app.get("/api/inventory/low-stock", requireAuth, async (_req, res) => {
    const items = await storage.getLowStockItems();
    res.json(items);
  });

  // --- Supplier Routes ---
  app.get("/api/suppliers", requireAuth, requirePermission("inventory.view"), async (_req, res) => {
    const all = await storage.getSuppliers();
    res.json(all);
  });

  app.post("/api/suppliers", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const data = insertSupplierSchema.parse(req.body);
    const supplier = await storage.createSupplier(data);
    logActivity(req, "CREATE", "Supplier", supplier.id, `Added supplier "${supplier.name}"`);
    res.status(201).json(supplier);
  });

  app.patch("/api/suppliers/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    const data = insertSupplierSchema.partial().parse(req.body);
    const updated = await storage.updateSupplier(id, data);
    logActivity(req, "UPDATE", "Supplier", id, `Updated supplier "${updated?.name}"`);
    res.json(updated);
  });

  app.delete("/api/suppliers/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    logActivity(req, "DELETE", "Supplier", id, "Deleted supplier");
    await storage.deleteSupplier(id);
    res.sendStatus(204);
  });

  // --- Purchase Order Routes ---
  app.get("/api/purchase-orders", requireAuth, requirePermission("inventory.view"), async (_req, res) => {
    const all = await storage.getPurchaseOrders();
    res.json(all);
  });

  app.get("/api/purchase-orders/:id", requireAuth, requirePermission("inventory.view"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    const po = await storage.getPurchaseOrder(id);
    if (!po) return res.status(404).json({ message: "Purchase order not found" });
    const items = await storage.getPurchaseOrderItems(id);
    res.json({ ...po, items });
  });

  app.post("/api/purchase-orders", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    try {
      const { items, ...orderData } = req.body;
      const data = insertPurchaseOrderSchema.parse(orderData);
      const po = await storage.createPurchaseOrder(data);
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const poItem = insertPurchaseOrderItemSchema.parse({
            ...item,
            purchaseOrderId: po.id,
          });
          await storage.createPurchaseOrderItem(poItem);
        }
      }
      const allItems = await storage.getPurchaseOrderItems(po.id);
      logActivity(req, "CREATE", "Purchase Order", po.id, `Created PO #${po.orderNumber}`);
      res.status(201).json({ ...po, items: allItems });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/purchase-orders/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    const data = insertPurchaseOrderSchema.partial().parse(req.body);
    const updated = await storage.updatePurchaseOrder(id, data);
    logActivity(req, "UPDATE", "Purchase Order", id, `Updated purchase order`);
    res.json(updated);
  });

  // Receive Purchase Order → update inventory quantities
  app.post("/api/purchase-orders/:id/receive", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    const po = await storage.getPurchaseOrder(id);
    if (!po) return res.status(404).json({ message: "Purchase order not found" });
    if (po.status === "received") return res.status(400).json({ message: "Already received" });

    const items = await storage.getPurchaseOrderItems(id);
    for (const poItem of items) {
      const invItem = await storage.getInventoryItem(poItem.inventoryItemId);
      if (invItem) {
        await storage.updateInventoryItem(invItem.id, {
          quantity: invItem.quantity + poItem.quantity,
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    logActivity(req, "RECEIVE", "Purchase Order", id, `Received PO #${po.orderNumber} with ${items.length} items`);
    const updated = await storage.updatePurchaseOrder(id, {
      status: "received",
      receivedDate: new Date().toISOString().split("T")[0],
    });
    res.json(updated);
  });

  app.delete("/api/purchase-orders/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    logActivity(req, "DELETE", "Purchase Order", id, "Deleted purchase order");
    await storage.deletePurchaseOrder(id);
    res.sendStatus(204);
  });

  // --- Accounts / Expenses Routes ---
  app.get("/api/expenses", requireAuth, requirePermission("accounts.view"), async (_req, res) => {
    const expenses = await storage.getExpenses();
    res.json(expenses);
  });

  app.post("/api/expenses", requireAuth, requirePermission("accounts.manage"), async (req, res) => {
    const data = insertExpenseSchema.parse(req.body);
    const expense = await storage.createExpense(data);
    logActivity(req, "CREATE", "Expense", expense.id, `Added expense: ${expense.description} (${expense.amount})`);
    res.status(201).json(expense);
  });

  app.delete("/api/expenses/:id", requireAuth, requirePermission("accounts.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    logActivity(req, "DELETE", "Expense", id, "Deleted expense");
    await storage.deleteExpense(id);
    res.sendStatus(204);
  });

  // Lab Reports
  app.get("/api/pets/:id/lab-reports", requireAuth, requirePermission("medical_records.view"), async (req, res) => {
    const id = parseInt(req.params.id);
    const reports = await storage.getLabReportsByPetId(id);
    res.json(reports);
  });

  app.get("/api/lab-reports", requireAuth, requirePermission("medical_records.view"), async (req, res) => {
    const reports = await storage.getAllLabReports();
    res.json(reports);
  });

  app.post("/api/lab-reports", requireAuth, requirePermission("medical_records.create"), async (req, res) => {
    try {
      // Allow optional result/details for initial order creation
      const result = insertLabReportSchema.safeParse(req.body);
      if (!result.success) {
        console.error("Lab report validation error:", JSON.stringify(result.error.issues));
        return res.status(400).json({ message: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
      }
      const report = await storage.createLabReport(result.data);
      logActivity(req, "CREATE", "Lab Report", report.id, `Created lab report "${report.title}"`);
      res.status(201).json(report);
    } catch (error: any) {
      console.error("Lab report creation error:", error);
      res.status(500).json({ message: error.message || "Failed to create lab report" });
    }
  });

  app.patch("/api/lab-reports/:id", requireAuth, requirePermission("medical_records.create"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = insertLabReportSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ') });
      }
      const updated = await storage.updateLabReport(id, result.data);
      if (!updated) return res.status(404).json({ message: "Lab report not found" });

      logActivity(req, "UPDATE", "Lab Report", id, `Updated lab report "${updated.title}"`);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/lab-reports/:id", requireAuth, requirePermission("medical_records.delete"), async (req, res) => {
    const id = parseInt(req.params.id);
    logActivity(req, "DELETE", "Lab Report", id, "Deleted lab report");
    await storage.deleteLabReport(id);
    res.sendStatus(204);
  });

  // --- Pet Documents ---
  app.get("/api/pet-documents/:petId", requireAuth, async (req, res) => {
    const petId = parseInt(String(req.params.petId));
    const docs = await storage.getPetDocuments(petId);
    res.json(docs);
  });

  app.post("/api/pet-documents", requireAuth, requirePermission("patients.edit"), upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    const petId = parseInt(String(req.body.petId));
    if (!petId || isNaN(petId)) return res.status(400).json({ message: "Valid petId is required" });

    const userId = (req.session as any)?.userId || null;
    const doc = await storage.createPetDocument({
      petId,
      fileUrl: url,
      fileName: req.body.fileName || req.file.originalname,
      category: req.body.category || "General",
      notes: req.body.notes || null,
      uploadedBy: userId,
    });
    logActivity(req, "CREATE", "Pet Document", doc.id, `Uploaded document "${doc.fileName}" for pet #${petId}`);
    res.status(201).json(doc);
  });

  // --- Dynamic Lab Settings Routes ---

  // Categories
  app.get("/api/lab-settings/categories", requireAuth, async (_req, res) => {
    const cats = await storage.getLabCategories();
    res.json(cats);
  });

  app.post("/api/lab-settings/categories", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const parsed = insertLabCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const cat = await storage.createLabCategory(parsed.data);
    logActivity(req, "CREATE", "Lab Category", cat.id, `Created lab category "${cat.name}"`);
    res.status(201).json(cat);
  });

  app.patch("/api/lab-settings/categories/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = insertLabCategorySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateLabCategory(id, parsed.data);
    logActivity(req, "UPDATE", "Lab Category", id, `Updated lab category`);
    res.json(updated);
  });

  app.delete("/api/lab-settings/categories/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteLabCategory(id);
    logActivity(req, "DELETE", "Lab Category", id, `Deleted lab category`);
    res.sendStatus(204);
  });

  // Tests
  app.get("/api/lab-settings/tests", requireAuth, async (req, res) => {
    const categoryId = req.query.categoryId ? parseInt(String(req.query.categoryId)) : undefined;
    const tests = await storage.getLabTests(categoryId);
    res.json(tests);
  });

  app.post("/api/lab-settings/tests", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const parsed = insertLabTestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const test = await storage.createLabTest(parsed.data);
    logActivity(req, "CREATE", "Lab Test", test.id, `Created lab test "${test.name}"`);
    res.status(201).json(test);
  });

  app.patch("/api/lab-settings/tests/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = insertLabTestSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateLabTest(id, parsed.data);
    res.json(updated);
  });

  app.delete("/api/lab-settings/tests/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteLabTest(id);
    res.sendStatus(204);
  });

  // Reference Ranges
  app.get("/api/lab-settings/ranges", requireAuth, async (req, res) => {
    const testId = req.query.testId ? parseInt(String(req.query.testId)) : undefined;
    const ranges = await storage.getLabRefRanges(testId);
    res.json(ranges);
  });

  app.post("/api/lab-settings/ranges", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const parsed = insertLabRefRangeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const range = await storage.createLabRefRange(parsed.data);
    res.status(201).json(range);
  });

  app.patch("/api/lab-settings/ranges/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(req.params.id);
    const parsed = insertLabRefRangeSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateLabRefRange(id, parsed.data);
    res.json(updated);
  });

  app.delete("/api/lab-settings/ranges/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteLabRefRange(id);
    res.sendStatus(204);
  });

  app.delete("/api/pet-documents/:id", requireAuth, requirePermission("patients.edit"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    logActivity(req, "DELETE", "Pet Document", id, "Deleted pet document");
    await storage.deletePetDocument(id);
    res.sendStatus(204);
  });

  app.get("/api/accounts/summary", requireAuth, requirePermission("accounts.view"), async (_req, res) => {
    const [allInvoices, allExpenses] = await Promise.all([
      storage.getInvoices(),
      storage.getExpenses(),
    ]);

    const totalIncome = allInvoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + parseFloat(String(inv.total)), 0);

    const totalExpenses = allExpenses
      .reduce((sum, exp) => sum + parseFloat(String(exp.amount)), 0);

    res.json({
      income: totalIncome,
      expenses: totalExpenses,
      netProfit: totalIncome - totalExpenses,
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
    const owner = await storage.getOwner(parseInt(String(req.params.id)));
    if (!owner) return res.status(404).json({ message: "Owner not found" });
    res.json(owner);
  });

  app.post("/api/owners", async (req, res) => {
    const parsed = insertOwnerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const owner = await storage.createOwner(parsed.data);
    logActivity(req, "CREATE", "Owner", owner.id, `Created owner "${owner.firstName} ${owner.lastName || ""}"`);
    res.status(201).json(owner);
  });

  app.patch("/api/owners/:id", async (req, res) => {
    const parsed = insertOwnerSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateOwner(parseInt(String(req.params.id)), parsed.data);
    if (!updated) return res.status(404).json({ message: "Owner not found" });
    logActivity(req, "UPDATE", "Owner", updated.id, `Updated owner "${updated.firstName}"`);
    res.json(updated);
  });

  app.delete("/api/owners/:id", async (req, res) => {
    logActivity(req, "DELETE", "Owner", parseInt(String(req.params.id)), "Deleted owner");
    await storage.deleteOwner(parseInt(String(req.params.id)));
    res.status(204).send();
  });

  // Pets
  app.get("/api/pets", async (_req, res) => {
    const allPets = await storage.getPets();
    res.json(allPets);
  });

  app.get("/api/pets/:id", async (req, res) => {
    const pet = await storage.getPet(parseInt(String(req.params.id)));
    if (!pet) return res.status(404).json({ message: "Pet not found" });
    res.json(pet);
  });

  app.post("/api/pets", async (req, res) => {
    const parsed = insertPetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const pet = await storage.createPet(parsed.data);
    logActivity(req, "CREATE", "Pet", pet.id, `Created pet "${pet.name}"`);
    res.status(201).json(pet);
  });

  app.patch("/api/pets/:id", async (req, res) => {
    const parsed = insertPetSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updatePet(parseInt(String(req.params.id)), parsed.data);
    if (!updated) return res.status(404).json({ message: "Pet not found" });
    logActivity(req, "UPDATE", "Pet", updated.id, `Updated pet "${updated.name}"`);
    res.json(updated);
  });

  app.delete("/api/pets/:id", async (req, res) => {
    logActivity(req, "DELETE", "Pet", parseInt(String(req.params.id)), "Deleted pet");
    await storage.deletePet(parseInt(String(req.params.id)));
    res.status(204).send();
  });

  // Appointments
  app.get("/api/appointments", async (_req, res) => {
    const allAppointments = await storage.getAppointments();
    res.json(allAppointments);
  });

  app.get("/api/appointments/:id", async (req, res) => {
    const appointment = await storage.getAppointment(parseInt(String(req.params.id)));
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    res.json(appointment);
  });

  app.post("/api/appointments", async (req, res) => {
    const parsed = insertAppointmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const appointment = await storage.createAppointment(parsed.data);
    logActivity(req, "CREATE", "Appointment", appointment.id, `Created appointment for pet #${appointment.petId}`);
    res.status(201).json(appointment);
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    const parsed = insertAppointmentSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateAppointment(parseInt(String(req.params.id)), parsed.data);
    if (!updated) return res.status(404).json({ message: "Appointment not found" });
    logActivity(req, "UPDATE", "Appointment", updated.id, `Updated appointment`);
    res.json(updated);
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    logActivity(req, "DELETE", "Appointment", parseInt(String(req.params.id)), "Deleted appointment");
    await storage.deleteAppointment(parseInt(String(req.params.id)));
    res.status(204).send();
  });

  // Medical Records
  app.get("/api/medical-records", async (_req, res) => {
    const records = await storage.getMedicalRecords();
    res.json(records);
  });

  app.get("/api/medical-records/:id", async (req, res) => {
    const record = await storage.getMedicalRecord(parseInt(String(req.params.id)));
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json(record);
  });

  app.post("/api/medical-records", async (req, res) => {
    const userId = (req.session as any)?.userId || null;
    const bodyWithMeta = { ...req.body, createdBy: userId };
    const parsed = insertMedicalRecordSchema.safeParse(bodyWithMeta);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const record = await storage.createMedicalRecord(parsed.data);
    logActivity(req, "CREATE", "Medical Record", record.id, `Created medical record for pet #${record.petId}`);
    res.status(201).json(record);
  });

  app.patch("/api/medical-records/:id", async (req, res) => {
    const id = parseInt(String(req.params.id));
    const sessionUserId = (req.session as any)?.userId;

    const existing = await storage.getMedicalRecord(id);
    if (!existing) return res.status(404).json({ message: "Record not found" });

    // Only the creator may edit
    if (!sessionUserId || existing.createdBy !== sessionUserId) {
      return res.status(403).json({ message: "You can only edit your own records" });
    }

    // Only within 24 hours of creation
    const hoursSinceCreation = (Date.now() - new Date(existing.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(410).json({ message: "Edit window has expired (24 hours)" });
    }

    const parsed = insertMedicalRecordSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const updated = await storage.updateMedicalRecord(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Record not found" });
    logActivity(req, "UPDATE", "Medical Record", id, `Updated medical record for pet #${existing.petId}`);
    res.json(updated);
  });

  app.delete("/api/medical-records/:id", async (req, res) => {
    logActivity(req, "DELETE", "Medical Record", parseInt(String(req.params.id)), "Deleted medical record");
    await storage.deleteMedicalRecord(parseInt(String(req.params.id)));
    res.status(204).send();
  });

  // --- Activity Log Routes ---
  app.get("/api/activity-logs", requireAuth, requirePermission("activity_log.view", "admin_dashboard.view"), async (req, res) => {
    const limit = parseInt(String(req.query.limit)) || 50;
    const offset = parseInt(String(req.query.offset)) || 0;
    const filters: any = {};
    if (req.query.userId) filters.userId = parseInt(String(req.query.userId));
    if (req.query.entityType) filters.entityType = String(req.query.entityType);
    if (req.query.startDate) filters.startDate = String(req.query.startDate);
    if (req.query.endDate) filters.endDate = String(req.query.endDate);

    const [logs, total] = await Promise.all([
      storage.getActivityLogs(limit, offset, Object.keys(filters).length > 0 ? filters : undefined),
      storage.getActivityLogCount(Object.keys(filters).length > 0 ? filters : undefined),
    ]);
    res.json({ logs, total, limit, offset });
  });

  // --- Species Routes ---
  app.get("/api/species", requireAuth, requirePermission("admin_dashboard.view"), async (_req, res) => {
    const list = await storage.getSpecies();
    res.json(list);
  });

  app.post("/api/species", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const parsed = insertSpeciesSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    try {
      const created = await storage.createSpecies(parsed.data);
      logActivity(req, "CREATE", "Species", created.id, `Created species "${created.name}"`);
      res.status(201).json(created);
    } catch (e: any) {
      if (e.code === '23505') { // unique constraint violation
        return res.status(409).json({ message: "Species already exists" });
      }
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/species/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteSpecies(id);
    logActivity(req, "DELETE", "Species", id, "Deleted species");
    res.sendStatus(204);
  });

  // --- Lab Settings Routes ---
  app.get("/api/lab-settings/categories", requireAuth, requirePermission("admin_dashboard.view"), async (_req, res) => {
    const cats = await storage.getLabCategories();
    res.json(cats);
  });

  app.post("/api/lab-settings/categories", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const parsed = insertLabCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createLabCategory(parsed.data);
    logActivity(req, "CREATE", "Lab Category", created.id, `Created category "${created.name}"`);
    res.status(201).json(created);
  });

  app.delete("/api/lab-settings/categories/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteLabCategory(id);
    logActivity(req, "DELETE", "Lab Category", id, "Deleted lab category");
    res.sendStatus(204);
  });

  app.get("/api/lab-settings/tests", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const categoryId = req.query.categoryId ? parseInt(String(req.query.categoryId)) : undefined;
    const tests = await storage.getLabTests(categoryId);
    res.json(tests);
  });

  app.post("/api/lab-settings/tests", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const parsed = insertLabTestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createLabTest(parsed.data);
    logActivity(req, "CREATE", "Lab Test", created.id, `Created lab test "${created.name}"`);
    res.status(201).json(created);
  });

  app.delete("/api/lab-settings/tests/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteLabTest(id);
    logActivity(req, "DELETE", "Lab Test", id, "Deleted lab test");
    res.sendStatus(204);
  });

  app.get("/api/lab-settings/ranges", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const testId = req.query.testId ? parseInt(String(req.query.testId)) : undefined;
    const ranges = await storage.getLabRefRanges(testId);
    res.json(ranges);
  });

  app.post("/api/lab-settings/ranges", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const parsed = insertLabRefRangeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createLabRefRange(parsed.data);
    logActivity(req, "CREATE", "Lab Ref Range", created.id, `Created reference range for test ${created.testId}`);
    res.status(201).json(created);
  });

  app.delete("/api/lab-settings/ranges/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteLabRefRange(id);
    logActivity(req, "DELETE", "Lab Ref Range", id, "Deleted reference range");
    res.sendStatus(204);
  });

  // --- Mindray BC-20s HL7 Receiver Routes ---
  // These endpoints allow the client to interact with the HL7 listener
  // that receives CBC results directly from the Mindray BC-20s machine

  // Import HL7 listener functions
  const { startHL7Listener, stopHL7Listener, getListenerStatus, getRecentResults, getLatestResult, clearResults, addManualResult } = await import('./hl7-listener');

  // Get listener status
  app.get("/api/mindray/status", requireAuth, async (_req, res) => {
    const status = getListenerStatus();
    res.json(status);
  });

  // Start the listener
  app.post("/api/mindray/start", requireAuth, async (req, res) => {
    const port = parseInt(String(req.body.port)) || 5100;
    try {
      startHL7Listener(port);
      // Wait a moment for it to start
      await new Promise(resolve => setTimeout(resolve, 500));
      const status = getListenerStatus();
      res.json({ message: `HL7 listener started on port ${port}`, ...status });
    } catch (error: any) {
      res.status(500).json({ message: `Failed to start listener: ${error.message}` });
    }
  });

  // Stop the listener
  app.post("/api/mindray/stop", requireAuth, async (_req, res) => {
    stopHL7Listener();
    res.json({ message: "HL7 listener stopped", running: false });
  });

  // Get latest CBC result
  app.get("/api/mindray/latest", requireAuth, async (_req, res) => {
    const result = getLatestResult();
    if (!result) {
      return res.status(404).json({ message: "No CBC results received yet" });
    }
    res.json(result);
  });

  // Get all recent results
  app.get("/api/mindray/results", requireAuth, async (_req, res) => {
    const results = getRecentResults();
    res.json(results);
  });

  // Clear stored results
  app.delete("/api/mindray/results", requireAuth, async (_req, res) => {
    clearResults();
    res.json({ message: "Results cleared" });
  });

  // Manual result entry (for testing without machine)
  app.post("/api/mindray/manual", requireAuth, async (req, res) => {
    const { data, sampleId } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ message: "Invalid data format" });
    }
    const result = addManualResult(data, sampleId);
    res.status(201).json(result);
  });

  // Webhook for the local relay agent running on clinic desktop
  app.post("/api/mindray/webhook", async (req, res) => {
    // In production, we'd add an API Key check here
    const { hl7Data } = req.body;
    if (typeof hl7Data !== 'string' || hl7Data.length === 0) {
      return res.status(400).json({ message: "Invalid or missing hl7Data payload" });
    }
    const { processReceivedData } = await import('./hl7-listener');
    processReceivedData(hl7Data);
    res.json({ success: true });
  });

  // Auto-start the HL7 listener on server boot
  try {
    startHL7Listener(5100);
    console.log('[Routes] Mindray HL7 listener auto-started on port 5100');
  } catch (err) {
    console.error('[Routes] Failed to auto-start HL7 listener:', err);
  }

  return httpServer;
}
