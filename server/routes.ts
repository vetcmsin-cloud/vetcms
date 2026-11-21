import express, { type Express } from "express";
import { type Server } from "http";
import { registerInventoryRoutes } from "./routes/inventory";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import {
  insertOwnerSchema, insertPetSchema, insertAppointmentSchema,
  insertMedicalRecordSchema, insertUserSchema, insertRoleSchema,
  insertFeeStructureSchema, insertInvoiceSchema, insertInvoiceItemSchema,
  insertInventoryItemSchema, insertInventorySubCategorySchema, insertExpenseSchema, insertClinicSettingSchema,
  insertLabReportSchema,
  insertLabCategorySchema, insertLabTestSchema, insertLabRefRangeSchema, insertSpeciesSchema,
  insertBloodSmearPathogenSchema,
  insertSupplierSchema, insertPurchaseOrderSchema, insertPurchaseOrderItemSchema,
  insertPurchaseSchema, insertPurchaseItemSchema,
  insertEstimateSchema,
  insertInventoryUnitSchema, insertInventoryCategorySchema, insertInventoryProductTypeSchema,
  insertTaxCategorySchema,
  insertExpenseCategorySchema,
  tenants, platformAdmins, platformClinicPayments, ALL_PERMISSIONS, users, roles,
} from "@shared/schema";
import { hashPassword, comparePassword, requireAuth, requireAdmin, requireRole, requirePermission, invalidatePermissionCache, getCachedUserWithRole } from "./auth";
import { db, getCurrentTenantId, getTenantAccessError, runWithTenant, tenantRequestContext } from "./db";
import { sql as sqlTag, eq, and, gte, desc, inArray, ilike, or } from "drizzle-orm";
import { petDocuments, invoices, appointments, pets, owners, invoiceItems, estimateItems, purchaseOrderItems, purchaseItems, publicReportShares } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import * as XLSX from "xlsx";

import os from "os";

const uploadsDir = process.env.VERCEL
  ? path.join(os.tmpdir(), "uploads")
  : path.resolve(process.cwd(), "server", "uploads");
const rootUploadsDir = process.env.VERCEL
  ? path.join(os.tmpdir(), "uploads")
  : path.resolve(process.cwd(), "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(rootUploadsDir)) {
    fs.mkdirSync(rootUploadsDir, { recursive: true });
  }
} catch (dirErr) {
  console.warn("[Uploads] Could not create local uploads folder:", dirErr);
}

const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
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

const memoryUpload = multer({ storage: multer.memoryStorage() });

// â”€â”€ IST Date Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns today's date in YYYY-MM-DD format in Indian Standard Time (UTC+5:30).
// Using plain new Date().toISOString() returns UTC which is 5h30m behind IST,
// causing wrong "today" between 00:00â€“05:30 IST.
function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
}
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use("/api", tenantRequestContext);
  const requirePlatformAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const id = Number((req.session as any)?.platformAdminId);
    if (!Number.isSafeInteger(id) || id <= 0) return res.status(403).json({ message: "Platform administrator access required" });
    const [admin] = await db.select({ id: platformAdmins.id }).from(platformAdmins).where(eq(platformAdmins.id, id)).limit(1);
    if (!admin) return res.status(403).json({ message: "Platform administrator access required" });
    next();
  };

  // Ensure public_report_shares table exists in database
  try {
    await db.execute(sqlTag`
      CREATE TABLE IF NOT EXISTS public_report_shares (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        filename TEXT NOT NULL,
        owner_phone TEXT,
        pet_name TEXT,
        report_title TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_public_report_shares_token ON public_report_shares (token);
    `);
  } catch (err) {
    console.error("Could not ensure public_report_shares table:", err);
  }

  // Helper to find a file across any uploads folder
  function findUploadedFile(filename: string): string | null {
    if (!filename) return null;
    const clean = path.basename(filename);
    const cleanNoExt = clean.replace(/\.pdf$/i, "");
    const candidates = [
      path.join(uploadsDir, clean),
      path.join(rootUploadsDir, clean),
      path.join(uploadsDir, `${clean}.pdf`),
      path.join(rootUploadsDir, `${clean}.pdf`),
      path.join(uploadsDir, `${cleanNoExt}.pdf`),
      path.join(rootUploadsDir, `${cleanNoExt}.pdf`),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return c;
      }
    }
    return null;
  }

  // Public Direct Short Report Link: /r/:token (e.g. /r/a7f39b1c)
  // Protected with unguessable cryptographic tokens — 100% public for pet parent, zero login required
  app.get(["/r/:token", "/api/r/:token"], async (req, res) => {
    try {
      const token = String(req.params.token || "").trim().replace(/\.pdf$/i, "");
      if (!token) return res.status(404).send("Report not found");

      let resolvedFilename = token;
      try {
        const rows = await db.select().from(publicReportShares).where(eq(publicReportShares.token, token)).limit(1);
        if (rows && rows.length > 0) {
          resolvedFilename = rows[0].filename;
        }
      } catch (dbErr) {
        console.warn("[Short Link Lookup DB Error]", dbErr);
      }

      const filePath = findUploadedFile(resolvedFilename) || findUploadedFile(token);
      if (!filePath) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Report Not Found</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
              .card { background: white; border-radius: 16px; padding: 36px 24px; max-width: 420px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); }
              h2 { margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 700; }
              p { color: #64748b; font-size: 14px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>📄 Report Not Found</h2>
              <p>The requested report could not be found or has expired. Please contact the clinic for assistance.</p>
            </div>
          </body>
          </html>
        `);
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${path.basename(filePath)}"`);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("X-Frame-Options", "ALLOWALL");
      return res.sendFile(filePath);
    } catch (e: any) {
      console.error("[Serve Short Link Error]", e);
      return res.status(500).send("Error loading report");
    }
  });

  // Metadata for public report — returns title & type (invoice vs lab) so the viewer shows the right heading
  app.get("/api/r/meta/:token", async (req, res) => {
    try {
      const token = String(req.params.token || "").trim().replace(/\.pdf$/i, "");
      if (!token) return res.json({ title: "Medical Document", type: "report" });
      const rows = await db.select().from(publicReportShares).where(eq(publicReportShares.token, token)).limit(1);
      if (!rows || rows.length === 0) return res.json({ title: "Medical Document", type: "report" });
      const row = rows[0];
      const reportTitle: string = row.reportTitle || "";
      const isInvoice = /invoice/i.test(reportTitle);
      return res.json({
        title: reportTitle || (isInvoice ? "Patient Invoice" : "Patient Lab Report"),
        type: isInvoice ? "invoice" : "report",
        petName: row.petName || null,
      });
    } catch {
      return res.json({ title: "Medical Document", type: "report" });
    }
  });

  // Public Direct Uploads Link: /uploads/:filename
  // Direct file serving so missing files or direct hits never redirect to login
  app.get("/uploads/:filename", (req, res) => {
    const filePath = findUploadedFile(req.params.filename);
    if (filePath) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif"
      };
      res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.sendFile(filePath);
    }
    return res.status(404).send("File not found");
  });

  app.use("/uploads", express.static(uploadsDir));
  app.use("/uploads", express.static(rootUploadsDir));

  // --- Activity Log Helper ---
  async function logActivity(req: express.Request, action: string, entityType: string, entityId?: number, details?: string) {
    try {
      const userId = (req.session as any)?.userId || null;
      // Use cached user lookup â€” avoids a DB query on every mutation
      const cached = userId ? await getCachedUserWithRole(userId, storage) : null;
      await storage.createActivityLog({
        userId,
        userName: cached?.user?.name || "System",
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Server-side data cache for heavy endpoints
  // Caches full table results for 15 seconds. Navigation between pages
  // no longer re-queries the database if data was recently fetched.
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const dataCache = new Map<string, { data: any; expiresAt: number }>();
  const DATA_CACHE_TTL = 15_000; // 15 seconds

  function getCachedData<T>(key: string): T | null {
    const scopedKey = `${getCurrentTenantId() ?? "public"}:${key}`;
    const entry = dataCache.get(scopedKey);
    if (entry && Date.now() < entry.expiresAt) return entry.data as T;
    if (entry) dataCache.delete(scopedKey);
    return null;
  }

  function setCachedData(key: string, data: any): void {
    const scopedKey = `${getCurrentTenantId() ?? "public"}:${key}`;
    dataCache.set(scopedKey, { data, expiresAt: Date.now() + DATA_CACHE_TTL });
  }

  function invalidateDataCache(...keys: string[]): void {
    if (keys.length === 0) {
      dataCache.clear();
    } else {
      const tenantPrefix = `${getCurrentTenantId() ?? "public"}:`;
      for (const k of keys) dataCache.delete(`${tenantPrefix}${k}`);
    }
  }

  app.post("/api/upload", requireAuth, requirePermission("admin_dashboard.view"), upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  });

  app.post("/api/upload/base64-pdf", express.json({ limit: "50mb" }), async (req, res) => {
    try {
      const { base64, filename, ownerPhone, petName, reportTitle } = req.body;
      if (!base64) return res.status(400).json({ message: "No base64 data provided" });
      
      const cleanBase64 = base64.includes("base64,") ? base64.split("base64,")[1] : base64;
      
      // Generate a secure unguessable 8-character token (4.2 billion combinations)
      const token = crypto.randomBytes(4).toString("hex"); // e.g. "a7e93f2c"
      
      // Filename on disk starts with owner mobile number + token for uniqueness
      const cleanPhone = ownerPhone ? String(ownerPhone).replace(/\D/g, "") : "";
      const finalName = cleanPhone ? `${cleanPhone}_${token}.pdf` : `Report_${token}.pdf`;
      const fileBuffer = Buffer.from(cleanBase64, 'base64');
      
      // Save to both uploads directories to ensure accessibility across deployments
      fs.writeFileSync(path.join(uploadsDir, finalName), fileBuffer);
      fs.writeFileSync(path.join(rootUploadsDir, finalName), fileBuffer);
      
      // Record token in database
      try {
        await db.insert(publicReportShares).values({
          token,
          filename: finalName,
          ownerPhone: cleanPhone || null,
          petName: petName || null,
          reportTitle: reportTitle || null,
        });
      } catch (dbErr) {
        console.warn("[Save Public Share DB Warning]", dbErr);
      }
      
      // Return ultra-short unguessable direct report link: /r/a7e93f2c
      res.json({ token, url: `/r/${token}`, shortUrl: `/r/${token}` });
    } catch (e: any) {
      console.error("[Upload Base64 PDF]", e);
      res.status(500).json({ message: "Failed to save PDF", error: e.message });
    }
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

  // Platform administration is deliberately outside any clinic tenant.
  app.get("/api/platform/clinics", requirePlatformAdmin, async (_req, res) => {
    const clinics = await db.select().from(tenants);
    const result = [];
    for (const clinic of clinics) {
      const counts = await runWithTenant(clinic.id, async () => {
        const [usersCount] = await db.select({ count: sqlTag<number>`count(*)::int` }).from(users);
        const [patientsCount] = await db.select({ count: sqlTag<number>`count(*)::int` }).from(pets);
        const [primaryAdmin] = await db.select({ name: users.name, email: users.email, phone: users.phone }).from(users).where(sqlTag`lower(${users.role}) = 'admin'`).orderBy(users.id).limit(1);
        const settings = await storage.getClinicSettings();
        const setting = (key: string) => settings.find((item) => item.key === key)?.value || null;
        return {
          users: usersCount?.count || 0,
          patients: patientsCount?.count || 0,
          contactName: clinic.contactName || primaryAdmin?.name || null,
          contactEmail: clinic.contactEmail || primaryAdmin?.email || null,
          contactPhone: clinic.contactPhone || primaryAdmin?.phone || setting("clinicPhone"),
          address: clinic.address || setting("clinicAddress"),
        };
      });
      result.push({ ...clinic, contactName: counts.contactName, contactEmail: counts.contactEmail, contactPhone: counts.contactPhone, address: counts.address, userCount: counts.users, patientCount: counts.patients });
    }
    res.json(result);
  });

  app.post("/api/platform/clinics", requirePlatformAdmin, async (req, res) => {
    const clinicName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const adminName = typeof req.body?.adminName === "string" ? req.body.adminName.trim() : "";
    const adminEmail = typeof req.body?.adminEmail === "string" ? req.body.adminEmail.trim().toLowerCase() : "";
    const adminPassword = typeof req.body?.adminPassword === "string" ? req.body.adminPassword : "";
    const contactEmail = typeof req.body?.contactEmail === "string" ? req.body.contactEmail.trim().toLowerCase() : adminEmail;
    const contactPhone = typeof req.body?.contactPhone === "string" ? req.body.contactPhone.trim() : "";
    const address = typeof req.body?.address === "string" ? req.body.address.trim() : "";
    const plan = typeof req.body?.plan === "string" ? req.body.plan : "standard";
    const status = req.body?.status === undefined ? "active" : req.body.status;
    const isDemo = req.body?.isDemo === true;
    if (clinicName.length < 2 || adminName.length < 2 || !/^\S+@\S+\.\S+$/.test(adminEmail) || adminPassword.length < 8) {
      return res.status(400).json({ message: "Clinic name, clinic admin name, a valid admin email, and an admin password of at least 8 characters are required" });
    }
    if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) return res.status(400).json({ message: "Contact email is invalid" });
    if (!['demo', 'standard', 'professional', 'enterprise'].includes(plan)) return res.status(400).json({ message: "Invalid clinic plan" });
    if (!["active", "suspended"].includes(status)) return res.status(400).json({ message: "Status must be active or suspended" });
    if (req.body?.isDemo !== undefined && typeof req.body.isDemo !== "boolean") return res.status(400).json({ message: "isDemo must be a boolean" });

    if (await storage.getUserByEmail(adminEmail)) return res.status(409).json({ message: "Admin email is already in use" });
    const [platformEmail] = await db.select({ id: platformAdmins.id }).from(platformAdmins).where(eq(platformAdmins.email, adminEmail)).limit(1);
    if (platformEmail) return res.status(409).json({ message: "Admin email is already in use" });

    const parseDate = (value: unknown): Date | null => {
      if (!value) return null;
      const textValue = String(value);
      const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(textValue) ? `${textValue}T23:59:59.999Z` : textValue);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const validUntil = req.body?.validUntil ? parseDate(req.body.validUntil) : null;
    const requestedDemoUntil = req.body?.demoUntil ? parseDate(req.body.demoUntil) : null;
    if (req.body?.validUntil && !validUntil) return res.status(400).json({ message: "Access validity date is invalid" });
    if (req.body?.demoUntil && !requestedDemoUntil) return res.status(400).json({ message: "Demo end date is invalid" });
    const demoUntil = isDemo ? requestedDemoUntil || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : requestedDemoUntil;

    const slugBase = clinicName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "clinic";
    const [clinic] = await db.insert(tenants).values({
      name: clinicName,
      slug: `${slugBase}-${crypto.randomBytes(4).toString("hex")}`,
      status,
      plan,
      contactName: adminName,
      contactEmail: contactEmail || adminEmail,
      contactPhone,
      address,
      isDemo,
      demoUntil,
      validUntil,
    }).returning();

    try {
      const hashedPassword = await hashPassword(adminPassword);
      await runWithTenant(clinic.id, async () => {
        await seedDatabase({ seedUsers: false });
        await db.update(roles).set({ permissions: [...ALL_PERMISSIONS] }).where(eq(roles.name, "admin"));
        await db.insert(users).values({ name: adminName, email: adminEmail, phone: contactPhone, password: hashedPassword, role: "admin" });
        await storage.upsertClinicSetting("clinicName", clinicName);
        if (contactPhone) await storage.upsertClinicSetting("clinicPhone", contactPhone);
        if (address) await storage.upsertClinicSetting("clinicAddress", address);
      });
    } catch (error) {
      await db.delete(tenants).where(eq(tenants.id, clinic.id)).catch(() => undefined);
      throw error;
    }

    res.status(201).json({ clinic, admin: { name: adminName, email: adminEmail } });
  });

  app.delete("/api/platform/clinics/:id", requirePlatformAdmin, async (req, res) => {
    const clinicId = Number(req.params.id);
    if (!Number.isSafeInteger(clinicId) || clinicId <= 0) return res.status(400).json({ message: "Invalid clinic ID" });

    const [deleted] = await db.delete(tenants).where(eq(tenants.id, clinicId)).returning({ id: tenants.id, name: tenants.name });
    if (!deleted) return res.status(404).json({ message: "Clinic not found" });

    // Clinic-owned records and payment history are removed by their tenant
    // foreign-key cascades when the clinic row is deleted.
    res.json({ message: `Clinic "${deleted.name}" and its data were deleted` });
  });

  app.patch("/api/platform/clinics/:id", requirePlatformAdmin, async (req, res) => {
    const clinicId = Number(req.params.id);
    if (!Number.isSafeInteger(clinicId) || clinicId <= 0) return res.status(400).json({ message: "Invalid clinic ID" });
    const update: Partial<typeof tenants.$inferInsert> = {};
    if (req.body?.name !== undefined) {
      if (typeof req.body.name !== "string" || req.body.name.trim().length < 2) return res.status(400).json({ message: "Clinic name must have at least 2 characters" });
      update.name = req.body.name.trim();
    }
    for (const field of ["contactName", "contactEmail", "contactPhone", "address"] as const) {
      if (req.body?.[field] === undefined) continue;
      if (typeof req.body[field] !== "string") return res.status(400).json({ message: `${field} must be text` });
      const value = req.body[field].trim();
      if (field === "contactEmail" && value && !/^\S+@\S+\.\S+$/.test(value)) return res.status(400).json({ message: "Contact email is invalid" });
      update[field] = value || null;
    }
    if (req.body?.status !== undefined) {
      if (!["active", "suspended"].includes(req.body.status)) return res.status(400).json({ message: "Status must be active or suspended" });
      update.status = req.body.status;
    }
    if (req.body?.plan !== undefined) {
      if (!['demo', 'standard', 'professional', 'enterprise'].includes(req.body.plan)) return res.status(400).json({ message: "Invalid clinic plan" });
      update.plan = req.body.plan;
    }
    if (req.body?.isDemo !== undefined) {
      if (typeof req.body.isDemo !== "boolean") return res.status(400).json({ message: "isDemo must be a boolean" });
      update.isDemo = req.body.isDemo;
    }
    for (const field of ["validUntil", "demoUntil"] as const) {
      if (req.body?.[field] === undefined) continue;
      const value = req.body[field];
      if (value === null || value === "") {
        update[field] = null;
      } else {
        const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T23:59:59.999Z` : value);
        if (Number.isNaN(date.getTime())) return res.status(400).json({ message: `${field} must be a valid date` });
        update[field] = date;
      }
    }
    if (Object.keys(update).length === 0) return res.status(400).json({ message: "No clinic settings were provided" });
    const [updated] = await db.update(tenants).set(update).where(eq(tenants.id, clinicId)).returning();
    if (!updated) return res.status(404).json({ message: "Clinic not found" });
    if (update.name) {
      try {
        await runWithTenant(clinicId, () => storage.upsertClinicSetting("clinicName", updated.name));
      } catch (error) {
        console.warn("Could not sync clinic name to workspace settings:", error);
      }
    }
    res.json(updated);
  });

  app.get("/api/platform/clinics/:id/payments", requirePlatformAdmin, async (req, res) => {
    const clinicId = Number(req.params.id);
    if (!Number.isSafeInteger(clinicId) || clinicId <= 0) return res.status(400).json({ message: "Invalid clinic ID" });
    const [clinic] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, clinicId)).limit(1);
    if (!clinic) return res.status(404).json({ message: "Clinic not found" });
    const payments = await db.select().from(platformClinicPayments)
      .where(eq(platformClinicPayments.clinicId, clinicId))
      .orderBy(desc(platformClinicPayments.paymentDate));
    res.json(payments);
  });

  app.get("/api/platform/clinics/:id/admins", requirePlatformAdmin, async (req, res) => {
    const clinicId = Number(req.params.id);
    if (!Number.isSafeInteger(clinicId) || clinicId <= 0) return res.status(400).json({ message: "Invalid clinic ID" });
    const [clinic] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, clinicId)).limit(1);
    if (!clinic) return res.status(404).json({ message: "Clinic not found" });
    const admins = await runWithTenant(clinicId, () => db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role }).from(users).where(sqlTag`lower(${users.role}) = 'admin'`));
    res.json(admins);
  });

  app.post("/api/platform/clinics/:id/admins", requirePlatformAdmin, async (req, res) => {
    const clinicId = Number(req.params.id);
    if (!Number.isSafeInteger(clinicId) || clinicId <= 0) return res.status(400).json({ message: "Invalid clinic ID" });
    const [clinic] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, clinicId)).limit(1);
    if (!clinic) return res.status(404).json({ message: "Clinic not found" });
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return res.status(400).json({ message: "Name, valid email, and password of at least 8 characters are required" });
    if (await storage.getUserByEmail(email)) return res.status(409).json({ message: "This email is already used by an account" });
    const [platformEmail] = await db.select({ id: platformAdmins.id }).from(platformAdmins).where(eq(platformAdmins.email, email)).limit(1);
    if (platformEmail) return res.status(409).json({ message: "This email is already used by an account" });
    const hashedPassword = await hashPassword(password);
    const [created] = await runWithTenant(clinicId, async () => {
      await db.update(roles).set({ permissions: [...ALL_PERMISSIONS] }).where(eq(roles.name, "admin"));
      return db.insert(users).values({ name, email, phone, password: hashedPassword, role: "admin" }).returning({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role });
    });
    res.status(201).json(created);
  });

  app.post("/api/platform/clinics/:id/payments", requirePlatformAdmin, async (req, res) => {
    const clinicId = Number(req.params.id);
    if (!Number.isSafeInteger(clinicId) || clinicId <= 0) return res.status(400).json({ message: "Invalid clinic ID" });
    const [clinic] = await db.select().from(tenants).where(eq(tenants.id, clinicId)).limit(1);
    if (!clinic) return res.status(404).json({ message: "Clinic not found" });

    const amount = Number(req.body?.amount);
    const currency = typeof req.body?.currency === "string" ? req.body.currency.trim().toUpperCase() : "INR";
    const method = typeof req.body?.method === "string" ? req.body.method : "";
    const status = req.body?.status === undefined ? "paid" : req.body.status;
    const allowedMethods = ["cash", "bank_transfer", "upi", "card", "cheque", "online", "other"];
    const allowedStatuses = ["paid", "pending", "failed", "refunded"];
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Payment amount must be greater than zero" });
    if (!/^[A-Z]{3}$/.test(currency)) return res.status(400).json({ message: "Currency must be a 3-letter code" });
    if (!allowedMethods.includes(method)) return res.status(400).json({ message: "Select a valid payment method" });
    if (!allowedStatuses.includes(status)) return res.status(400).json({ message: "Invalid payment status" });

    const parseDate = (value: unknown, endOfDay = false): Date | null => {
      if (!value) return null;
      const textValue = String(value);
      const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(textValue) ? `${textValue}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z` : textValue);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const paymentDate = parseDate(req.body?.paymentDate) || new Date();
    const periodStart = parseDate(req.body?.periodStart);
    const periodEnd = parseDate(req.body?.periodEnd, true);
    const validUntil = parseDate(req.body?.validUntil, true);
    if (req.body?.paymentDate && !parseDate(req.body.paymentDate)) return res.status(400).json({ message: "Payment date is invalid" });
    for (const field of ["periodStart", "periodEnd", "validUntil"] as const) {
      if (req.body?.[field] && !({ periodStart, periodEnd, validUntil }[field])) {
        return res.status(400).json({ message: `${field} is invalid` });
      }
    }
    if (periodStart && periodEnd && periodStart > periodEnd) return res.status(400).json({ message: "Billing period end must be on or after its start" });
    const paymentInput = {
      clinicId,
      amount: amount.toFixed(2),
      currency,
      method,
      status,
      paymentDate,
      reference: typeof req.body?.reference === "string" ? req.body.reference.trim() || null : null,
      periodStart,
      periodEnd,
      notes: typeof req.body?.notes === "string" ? req.body.notes.trim() || null : null,
      recordedBy: Number((req.session as any).platformAdminId),
    };

    const payment = await db.transaction(async (tx) => {
      const [created] = await tx.insert(platformClinicPayments).values(paymentInput).returning();
      if (status === "paid" && (validUntil || periodEnd)) {
        await tx.update(tenants).set({
          validUntil: validUntil || periodEnd,
          status: "active",
          isDemo: false,
        }).where(eq(tenants.id, clinicId));
      }
      return created;
    });
    res.status(201).json(payment);
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    const clinicName = typeof req.body?.clinicName === "string" ? req.body.clinicName.trim() : "";
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
    if (clinicName.length < 2 || name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      return res.status(400).json({ message: "Enter a clinic name, your name, a valid email, and a password of at least 8 characters" });
    }
    if (await storage.getUserByEmail(email)) return res.status(409).json({ message: "Email already in use" });
    const [platformEmail] = await db.select({ id: platformAdmins.id }).from(platformAdmins).where(eq(platformAdmins.email, email)).limit(1);
    if (platformEmail) return res.status(409).json({ message: "Email already in use" });

    const slugBase = clinicName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "clinic";
    const [tenant] = await db.insert(tenants).values({
      name: clinicName,
      slug: `${slugBase}-${crypto.randomBytes(4).toString("hex")}`,
      status: "active",
      plan: "demo",
      contactName: name,
      contactEmail: email,
      contactPhone: phone,
      isDemo: true,
      demoUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    }).returning();
    try {
      const hashedPassword = await hashPassword(password);
      await runWithTenant(tenant.id, async () => {
        await seedDatabase({ seedUsers: false });
        await db.update(roles).set({ permissions: [...ALL_PERMISSIONS] }).where(eq(roles.name, "admin"));
        await db.insert(users).values({ name, email, phone, password: hashedPassword, role: "admin" });
        await storage.upsertClinicSetting("clinicName", clinicName);
      });
    } catch (error) {
      await db.delete(tenants).where(eq(tenants.id, tenant.id)).catch(() => undefined);
      throw error;
    }
    res.status(201).json({ message: "Clinic created. You can now sign in with your account." });
  });

  app.post("/api/auth/login", async (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: "Invalid request body" });
    }
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const [platformAdmin] = await db.select().from(platformAdmins).where(eq(platformAdmins.email, email)).limit(1);
    if (platformAdmin) {
      const validPlatformPassword = await comparePassword(password, platformAdmin.password);
      if (!validPlatformPassword) return res.status(401).json({ message: "Invalid credentials" });
      (req.session as any).platformAdminId = platformAdmin.id;
      (req.session as any).userRole = "superadmin";
      delete (req.session as any).userId;
      delete (req.session as any).tenantId;
      const { password: _secret, ...safePlatformAdmin } = platformAdmin;
      return req.session.save((err) => {
        if (err) return res.status(500).json({ message: "Session save failed" });
        res.json({ ...safePlatformAdmin, role: "superadmin", tenantId: null, isPlatformAdmin: true, effectivePermissions: ["platform.clinics.manage"] });
      });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await comparePassword(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    if (!Number.isSafeInteger(user.tenantId) || user.tenantId <= 0) {
      return res.status(401).json({ message: "Account is not assigned to a clinic" });
    }
    const tenantAccessError = await getTenantAccessError(user.tenantId);
    if (tenantAccessError) return res.status(403).json({ message: tenantAccessError, code: "CLINIC_ACCESS_DISABLED" });

    delete (req.session as any).platformAdminId;
    (req.session as any).userId = user.id;
    (req.session as any).userRole = user.role;
    (req.session as any).tenantId = user.tenantId;

    const role = await runWithTenant(user.tenantId, () => storage.getRoleByName(user.role));
    const effectivePermissions = (user.permissions !== null && user.permissions !== undefined && Array.isArray(user.permissions))
      ? user.permissions
      : (role?.permissions || []);

    const { password: _, ...safeUser } = user;

    req.session.save((err) => {
      if (err) return res.status(500).json({ message: "Session save failed" });
      // Fire activity log in background â€” don't block the login response
      void runWithTenant(user.tenantId, () => logActivity(req, "LOGIN", "Auth", user.id, `User "${user.name}" logged in`));
      res.json({ ...safeUser, effectivePermissions });
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    const userId = (req.session as any)?.userId;
    if (userId) logActivity(req, "LOGOUT", "Auth", userId, "User logged out");
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Failed to logout" });
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const platformAdminId = Number((req.session as any)?.platformAdminId);
    if (Number.isSafeInteger(platformAdminId) && platformAdminId > 0) {
      const [platformAdmin] = await db.select().from(platformAdmins).where(eq(platformAdmins.id, platformAdminId)).limit(1);
      if (!platformAdmin) return res.status(401).json({ message: "Platform administrator not found" });
      const { password: _secret, ...safePlatformAdmin } = platformAdmin;
      return res.json({ ...safePlatformAdmin, role: "superadmin", tenantId: null, isPlatformAdmin: true, effectivePermissions: ["platform.clinics.manage"] });
    }
    if (!(req.session as any).userId) return res.status(401).json({ message: "Not authenticated" });
    const userId = (req.session as any).userId;

    // Sessions created before tenant support are assigned from their user row.
    if (!Number.isSafeInteger(Number((req.session as any).tenantId))) {
      const user = await storage.getUser(Number(userId));
      if (!user) return res.status(401).json({ message: "User not found" });
      (req.session as any).tenantId = user.tenantId;
      await new Promise<void>((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
    }
    
    // Use the user+role cache to avoid 2 DB round-trips on every page navigation
    const cached = await getCachedUserWithRole(userId, storage);
    if (!cached) return res.status(401).json({ message: "User not found" });

    const { user, role } = cached;

    // Priority: user-level permissions override â†’ role permissions â†’ minimal fallback
    let effectivePermissions: string[] = [];
    if (user.permissions !== null && user.permissions !== undefined && Array.isArray(user.permissions) && user.permissions.length > 0) {
      // User has explicit override permissions
      effectivePermissions = user.permissions;
    } else if (role?.permissions && Array.isArray(role.permissions) && role.permissions.length > 0) {
      // Use role permissions
      effectivePermissions = role.permissions;
    } else {
      // Fallback: minimal set so user can at least see the sidebar
      effectivePermissions = [
        "dashboard.view",
        "patients.view",
        "owners.view",
        "appointments.view",
        "medical_records.view",
        "billing.view",
      ];
    }

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
    if (currentUser.role.toLowerCase() !== "superadmin") {
      visibleUsers = allUsers.filter(u => u.role.toLowerCase() !== "superadmin");
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
    const [platformEmail] = await db.select({ id: platformAdmins.id }).from(platformAdmins).where(eq(platformAdmins.email, parsed.data.email)).limit(1);
    if (platformEmail) return res.status(409).json({ message: "Email already in use" });

    const hashedPassword = await hashPassword(parsed.data.password);
    const user = await storage.createUser({
      ...parsed.data,
      tenantId: Number((req.session as any).tenantId),
      password: hashedPassword,
    });
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
    if (parsed.data.email) {
      const [platformEmail] = await db.select({ id: platformAdmins.id }).from(platformAdmins).where(eq(platformAdmins.email, parsed.data.email)).limit(1);
      if (platformEmail) return res.status(409).json({ message: "Email already in use" });
    }

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
    if (!updated) return res.status(404).json({ message: "User not found" });

    // Invalidate permission cache so the updated permissions take effect immediately
    invalidatePermissionCache(userId);

    const { password: _, ...safeUser } = updated;
    logActivity(req, "UPDATE", "User", updated.id, `Updated user "${updated.name}"`);
    res.json(safeUser);
  });

  app.delete("/api/users/:id", requireAuth, requirePermission("user_management.manage"), async (req, res) => {
    const user = await storage.getUser(parseInt(String(req.params.id)));
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "superadmin") return res.status(403).json({ message: "Cannot delete super admin" });
    await storage.deleteUser(parseInt(String(req.params.id)));
    invalidatePermissionCache(user.id); // Remove from cache on delete
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
    try {
      const parsed = insertRoleSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

      const role = await storage.getRole(parseInt(String(req.params.id)));
      if (!role) return res.status(404).json({ message: "Role not found" });

      const updated = await storage.updateRole(parseInt(String(req.params.id)), parsed.data);
      // Invalidate ALL permission caches â€” role change affects all members of that role
      invalidatePermissionCache();
      logActivity(req, "UPDATE", "Role", updated?.id, `Updated role "${updated?.name}"`);
      res.json(updated);
    } catch (err: any) {
      console.error("[PATCH /api/roles/:id] Error:", err);
      res.status(500).json({ message: err?.message || "Failed to update role" });
    }
  });

  app.delete("/api/roles/:id", requireAuth, requirePermission("roles.manage"), async (req, res) => {
    const role = await storage.getRole(parseInt(String(req.params.id)));
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (role.isSystem) return res.status(403).json({ message: "Cannot delete system role" });
    await storage.deleteRole(parseInt(String(req.params.id)));
    // Invalidate ALL permission caches â€” role was removed
    invalidatePermissionCache();
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
    // Fetch invoices, users, owners, and pets in parallel for maximum performance
    const [allInvoices, allUsers, allOwners, allPets] = await Promise.all([
      storage.getInvoices(),
      storage.getUsers(),
      storage.getOwners(),
      storage.getPets(),
    ]);
    const enriched = allInvoices.map((inv) => {
      const creator = inv.createdBy ? allUsers.find((u) => u.id === inv.createdBy) : null;
      const biller  = inv.billedBy  ? allUsers.find((u) => u.id === inv.billedBy)  : null;
      const owner   = allOwners.find((o) => o.id === inv.ownerId);
      const pet     = inv.petId ? allPets.find((p) => p.id === inv.petId) : null;
      // For OP invoices use the free-text name fields; for IP invoices use joined owner/pet names
      const ownerName = (inv.invoiceType === "op" && inv.opOwnerName)
        ? inv.opOwnerName
        : owner ? `${owner.firstName} ${owner.lastName || ""}`.trim() : "";
      const petName = (inv.invoiceType === "op" && inv.opPetName)
        ? inv.opPetName
        : pet?.name || "";
      return {
        ...inv,
        ownerName,
        petName,
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
    // Use a temp unique placeholder â€” storage.createInvoice will immediately
    // update this to the real #PET-XXXX number based on the actual row id.
    const tempNumber = `#TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const dataWithMeta = { ...invoiceData, invoiceNumber: tempNumber, createdBy: userId, status: invoiceData.status || "pending" };
    // If saving direct as paid
    if (dataWithMeta.status === "paid" && !dataWithMeta.billedBy) {
      dataWithMeta.billedBy = userId;
    }

    // For OP invoices, ownerId may be 0 (no linked owner). We relax the FK
    // by validating without ownerId and then adding it back so Postgres accepts it.
    let invoiceToCreate: any;
    if (invoiceData.invoiceType === "op") {
      // Validate everything except ownerId, then inject it back
      const { ownerId: _skip, ...opData } = dataWithMeta;
      const parsed = insertInvoiceSchema.partial().safeParse(opData);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      invoiceToCreate = { ...parsed.data, ownerId: 0 };
    } else {
      const parsed = insertInvoiceSchema.safeParse(dataWithMeta);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      invoiceToCreate = parsed.data;
    }

    // Fetch stock checking setting
    const stockSettingEntity = await storage.getClinicSetting("inventory_negative_stock");
    const stockSetting = stockSettingEntity?.settingValue || "warn"; // default is warn, meaning it allows it but UI warned

    // Pre-check for "block"
    if (items && Array.isArray(items) && stockSetting === "block") {
      for (const item of items) {
        if (item.inventoryId) {
          const invItem = await storage.getInventoryItem(item.inventoryId);
          if (invItem && invItem.quantity < item.quantity) {
            return res.status(400).json({ message: `Cannot create invoice: Insufficient stock for ${invItem.name}. Current stock: ${invItem.quantity}` });
          }
        }
      }
    }

    const invoice = await storage.createInvoice(invoiceToCreate);

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await storage.createInvoiceItem({
          ...item,
          invoiceId: invoice.id,
        });

        // Deduct stock
        if (item.inventoryId) {
          const invItem = await storage.getInventoryItem(item.inventoryId);
          if (invItem) {
            await storage.updateInventoryItem(invItem.id, { quantity: invItem.quantity - item.quantity });
          }
        }
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
    const { paymentMethod } = req.body as { paymentMethod?: string };
    const existing = await storage.getInvoice(invoiceId);
    if (!existing) return res.status(404).json({ message: "Invoice not found" });

    if (existing.status !== "pending" && existing.status !== "forwarded") {
      return res.status(400).json({ message: "Only pending or forwarded invoices can be marked as paid" });
    }

    const updated = await storage.updateInvoice(invoiceId, {
      status: "paid",
      billedBy: userId,
      paymentMethod: paymentMethod || "cash",
    });
    if (!updated) return res.status(404).json({ message: "Invoice not found" });
    logActivity(req, "MARK_PAID", "Invoice", invoiceId, `Marked invoice #${existing.invoiceNumber} as paid via ${paymentMethod || "cash"}`);

    // Auto-create Ledger Entry for Sale
    const owner = existing.ownerId ? await storage.getOwner(existing.ownerId) : null;
    const isOp = !existing.ownerId;
    const vNum = await storage.getNextVoucherNumber("sale");
    
    // Check if entry already exists (prevent duplicate on accidental re-fire)
    const existingLedger = await storage.getLedgerEntryByReference("invoice", updated.id);
    if (!existingLedger) {
      await storage.createLedgerEntry({
        date: istToday(),
        voucherNumber: vNum,
        type: "sale",
        category: "Sales Revenue",
        description: `Payment received for Invoice ${existing.invoiceNumber}`,
        party: owner ? `${owner.firstName} ${owner.lastName || ''}`.trim() : (isOp ? "Walk-in OP" : "Unknown"),
        referenceType: "invoice",
        referenceId: updated.id,
        referenceNumber: existing.invoiceNumber || undefined,
        debitAmount: String(updated.total),
        creditAmount: "0",
        paymentMethod: paymentMethod || "cash",
        createdBy: userId,
      });
    }

    const items = await storage.getInvoiceItems(updated.id);
    const creator = updated.createdBy ? await storage.getUser(updated.createdBy) : null;
    const biller = updated.billedBy ? await storage.getUser(updated.billedBy) : null;
    res.json({ ...updated, items, createdByName: creator?.name || "System", createdByPhone: creator?.phone || "", billedByName: biller?.name || "" });
  });

  // Convert estimate to invoice
  app.post("/api/invoices/:id/convert-to-invoice", requireAuth, requirePermission("billing.manage", "billing.create", "billing.edit"), async (req, res) => {
    const invoiceId = parseInt(String(req.params.id));
    const existing = await storage.getInvoice(invoiceId);
    if (!existing) return res.status(404).json({ message: "Estimate not found" });
    if (existing.status !== "estimate") {
      return res.status(400).json({ message: "Only estimates can be converted to invoices" });
    }
    const updated = await storage.updateInvoice(invoiceId, { status: "pending" });
    if (!updated) return res.status(404).json({ message: "Estimate not found" });
    const items = await storage.getInvoiceItems(updated.id);
    const creator = updated.createdBy ? await storage.getUser(updated.createdBy) : null;
    logActivity(req, "CONVERT_ESTIMATE", "Invoice", invoiceId, `Converted estimate #${existing.invoiceNumber} to invoice`);
    res.json({ ...updated, items, createdByName: creator?.name || "System", createdByPhone: creator?.phone || "" });
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

    // Paid invoices: only admin or the person who finalized (billedBy) may edit
    if (existing.status === "paid") {
      const isAdmin = ["admin", "super admin", "superadmin"].includes((user?.role || "").toLowerCase());
      const isBiller = existing.billedBy ? existing.billedBy === userId : existing.createdBy === userId;
      if (!isAdmin && !isBiller) {
        return res.status(403).json({ message: "Only admin or the person who finalized can edit a paid invoice" });
      }
    }

    const parsed = insertInvoiceSchema.partial().safeParse(invoiceData);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const updated = await storage.updateInvoice(parseInt(String(req.params.id)), parsed.data);
    if (!updated) return res.status(404).json({ message: "Invoice not found" });

    if (items && Array.isArray(items)) {
      const stockSettingEntity = await storage.getClinicSetting("inventory_negative_stock");
      const stockSetting = stockSettingEntity?.settingValue || "warn";

      const oldItems = await storage.getInvoiceItems(updated.id);

      // We pre-calculate if the new invoice items will overdraft the stock if setting is "block"
      if (stockSetting === "block") {
        for (const newItem of items) {
          if (newItem.inventoryId) {
            const invItem = await storage.getInventoryItem(newItem.inventoryId);
            if (invItem) {
               const oldItem = oldItems.find(o => o.inventoryId === newItem.inventoryId);
               const oldQty = oldItem ? oldItem.quantity : 0;
               if (invItem.quantity + oldQty < newItem.quantity) {
                 return res.status(400).json({ message: `Cannot update invoice: Insufficient stock for ${invItem.name}. Current stock: ${invItem.quantity}` });
               }
            }
          }
        }
      }

      // Revert old stock
      for (const old of oldItems) {
        if (old.inventoryId) {
           const invItem = await storage.getInventoryItem(old.inventoryId);
           if (invItem) {
             await storage.updateInventoryItem(invItem.id, { quantity: invItem.quantity + old.quantity });
           }
        }
      }

      await storage.deleteInvoiceItemsByInvoice(updated.id);

      for (const item of items) {
        await storage.createInvoiceItem({
          ...item,
          invoiceId: updated.id,
        });

        // Deduct new stock
        if (item.inventoryId) {
          const invItem = await storage.getInventoryItem(item.inventoryId);
          if (invItem) {
            await storage.updateInventoryItem(invItem.id, { quantity: invItem.quantity - item.quantity });
          }
        }
      }
    }

    const updatedItems = await storage.getInvoiceItems(updated.id);
    const creator = updated.createdBy ? await storage.getUser(updated.createdBy) : null;
    logActivity(req, "UPDATE", "Invoice", updated!.id, `Updated invoice #${updated!.invoiceNumber}`);
    res.json({ ...updated, items: updatedItems, createdByName: creator?.name || "System", createdByPhone: creator?.phone || "" });
  });

  app.delete("/api/invoices/:id", requireAuth, requirePermission("billing.manage", "billing.delete"), async (req, res) => {
    logActivity(req, "DELETE", "Invoice", parseInt(String(req.params.id)), "Deleted invoice");
    
    // Restore stock before deleting
    const oldItems = await storage.getInvoiceItems(parseInt(String(req.params.id)));
    for (const old of oldItems) {
      if (old.inventoryId) {
         const invItem = await storage.getInventoryItem(old.inventoryId);
         if (invItem) {
           await storage.updateInventoryItem(invItem.id, { quantity: invItem.quantity + old.quantity });
         }
      }
    }
    // Delete associated ledger entry if it was paid
    const ledgerEntry = await storage.getLedgerEntryByReference("invoice", parseInt(String(req.params.id)));
    if (ledgerEntry) {
      await storage.deleteLedgerEntry(ledgerEntry.id);
    }

    await storage.deleteInvoice(parseInt(String(req.params.id)));
    res.status(204).send();
  });

  // Estimates (separate module â€“ no owner FK)
  app.get("/api/estimates", requireAuth, requirePermission("billing.view", "billing.create", "billing.edit", "billing.delete"), async (_req, res) => {
    try {
      const all = await storage.getEstimates();
      const users = await storage.getUsers();
      const enriched = all.map(est => {
        const creator = est.createdBy ? users.find(u => u.id === est.createdBy) : null;
        return { ...est, createdByName: creator?.name || "System" };
      });
      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch estimates" });
    }
  });

  app.get("/api/estimates/:id", requireAuth, requirePermission("billing.view", "billing.create", "billing.edit", "billing.delete"), async (req, res) => {
    try {
      const est = await storage.getEstimate(parseInt(String(req.params.id)));
      if (!est) return res.status(404).json({ message: "Estimate not found" });
      const items = await storage.getEstimateItems(est.id);
      const creator = est.createdBy ? await storage.getUser(est.createdBy) : null;
      res.json({ ...est, items, createdByName: creator?.name || "System" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch estimate" });
    }
  });

  app.post("/api/estimates", requireAuth, requirePermission("billing.view", "billing.create", "billing.edit"), async (req, res) => {
    try {
      const { items, ...estData } = req.body as any;
      const userId = (req.session as any).userId;
      const estimateNumber = await storage.getNextEstimateNumber();
      const data = { ...estData, estimateNumber, createdBy: userId };
      const parsed = insertEstimateSchema.safeParse(data);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const est = await storage.createEstimate(parsed.data);
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createEstimateItem({ ...item, estimateId: est.id });
        }
      }
      const createdItems = await storage.getEstimateItems(est.id);
      const creator = est.createdBy ? await storage.getUser(est.createdBy) : null;
      logActivity(req, "CREATE", "Estimate", est.id, `Created estimate #${est.estimateNumber}`);
      res.status(201).json({ ...est, items: createdItems, createdByName: creator?.name || "System" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to create estimate" });
    }
  });

  app.patch("/api/estimates/:id", requireAuth, requirePermission("billing.view", "billing.create", "billing.edit"), async (req, res) => {
    try {
      const { items, ...estData } = req.body as any;
      const existing = await storage.getEstimate(parseInt(String(req.params.id)));
      if (!existing) return res.status(404).json({ message: "Estimate not found" });
      if (existing.status === "converted") return res.status(400).json({ message: "Converted estimates cannot be edited" });
      const parsed = insertEstimateSchema.partial().safeParse(estData);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const updated = await storage.updateEstimate(parseInt(String(req.params.id)), parsed.data);
      if (!updated) return res.status(404).json({ message: "Estimate not found" });
      if (items && Array.isArray(items)) {
        await storage.deleteEstimateItemsByEstimate(updated.id);
        for (const item of items) {
          await storage.createEstimateItem({ ...item, estimateId: updated.id });
        }
      }
      const updatedItems = await storage.getEstimateItems(updated.id);
      const creator = updated.createdBy ? await storage.getUser(updated.createdBy) : null;
      logActivity(req, "UPDATE", "Estimate", updated.id, `Updated estimate #${updated.estimateNumber}`);
      res.json({ ...updated, items: updatedItems, createdByName: creator?.name || "System" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to update estimate" });
    }
  });

  app.delete("/api/estimates/:id", requireAuth, requirePermission("billing.view", "billing.delete", "billing.edit"), async (req, res) => {
    try {
      logActivity(req, "DELETE", "Estimate", parseInt(String(req.params.id)), "Deleted estimate");
      await storage.deleteEstimate(parseInt(String(req.params.id)));
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to delete estimate" });
    }
  });

  // Convert estimate to invoice (requires owner details in body)
  app.post("/api/estimates/:id/convert", requireAuth, requirePermission("billing.view", "billing.create", "billing.edit"), async (req, res) => {
    try {
      const estimateId = parseInt(String(req.params.id));
      const userId = (req.session as any).userId;

      const est = await storage.getEstimate(estimateId);
      if (!est) return res.status(404).json({ message: "Estimate not found" });
      if (est.status === "converted") return res.status(400).json({ message: "Already converted" });

      const { ownerId: ownerIdRaw, ownerFirstName, ownerLastName, ownerPhone, ownerEmail, ownerAddress, petId: petIdRaw, date } = req.body as any;

      let ownerId: number;
      if (ownerIdRaw) {
        ownerId = parseInt(String(ownerIdRaw));
        const owner = await storage.getOwner(ownerId);
        if (!owner) return res.status(404).json({ message: "Owner not found" });
      } else {
        if (!ownerFirstName || !ownerPhone) {
          return res.status(400).json({ message: "Owner first name and phone are required" });
        }
        const newOwner = await storage.createOwner({
          firstName: ownerFirstName,
          lastName: ownerLastName || "",
          phone: ownerPhone,
          email: ownerEmail || undefined,
          address: ownerAddress || undefined,
        });
        ownerId = newOwner.id;
        invalidateDataCache("owners"); // ensure new owner appears in search immediately
      }

      const tempNumber = `#TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const estItems = await storage.getEstimateItems(estimateId);
      const invoice = await storage.createInvoice({
        invoiceNumber: tempNumber,
        ownerId,
        petId: petIdRaw ? parseInt(String(petIdRaw)) : null,
        date: date || est.date,
        status: "pending",
        subtotal: est.subtotal,
        tax: est.tax,
        discount: est.discount,
        total: est.total,
        notes: est.notes || undefined,
        createdBy: userId,
      });

      for (const item of estItems) {
        await storage.createInvoiceItem({
          invoiceId: invoice.id,
          feeId: item.feeId || undefined,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        });
      }

      await storage.updateEstimate(estimateId, { status: "converted", convertedInvoiceId: invoice.id });
      logActivity(req, "CONVERT", "Estimate", estimateId, `Converted estimate #${est.estimateNumber} to invoice #${invoice.invoiceNumber}`);

      const creator = invoice.createdBy ? await storage.getUser(invoice.createdBy) : null;
      const invoiceItemsResult = await storage.getInvoiceItems(invoice.id);
      res.status(201).json({ invoice: { ...invoice, items: invoiceItemsResult, createdByName: creator?.name || "System" }, estimateId });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to convert estimate" });
    }
  });

  // Clinic Settings
  app.get("/api/clinic-settings", async (_req, res) => {
    const settings = await storage.getClinicSettings();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.settingKey] = s.settingValue;
    }
    const tenantId = getCurrentTenantId();
    if (tenantId && !map.clinicName?.trim()) {
      const [tenant] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      if (tenant?.name) map.clinicName = tenant.name;
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

  // WhatsApp Sending Gateway Endpoint
  app.post("/api/whatsapp/send", requireAuth, async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone) return res.status(400).json({ message: "Phone number is required" });

      const settingsList = await storage.getClinicSettings();
      const settings: Record<string, string> = {};
      for (const s of settingsList) settings[s.settingKey] = s.settingValue;

      const mode = settings.whatsappMode || "direct";
      const countryCode = (settings.whatsappCountryCode || "91").replace(/\D/g, "");

      let cleanPhone = String(phone).replace(/\D/g, "").replace(/^0+/, "");
      const finalPhone = cleanPhone.length === 10 ? `${countryCode}${cleanPhone}` : cleanPhone;

      // ── Evolution API mode (free, self-hosted) ──
      if (mode === "evolution" && settings.evolutionApiUrl && settings.evolutionApiKey && settings.evolutionInstance) {
        const { document, filename } = req.body;
        const baseUrl = settings.evolutionApiUrl.replace(/\/$/, "");
        const instance = settings.evolutionInstance;
        const headers = {
          "Content-Type": "application/json",
          "apikey": settings.evolutionApiKey,
        };

        let apiRes: Response;
        if (document) {
          // Send PDF as document via /message/sendMedia
          const cleanBase64 = document.includes("base64,") ? document.split("base64,")[1] : document;
          const payload = {
            number: finalPhone,
            options: { delay: 800, presence: "composing" },
            mediaMessage: {
              mediatype: "document",
              fileName: filename || "document.pdf",
              caption: message || "",
              media: cleanBase64,
            },
          };
          console.log(`[Evolution API] Sending document to ${finalPhone} via ${baseUrl}`);
          apiRes = await fetch(`${baseUrl}/message/sendMedia/${instance}`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });
        } else {
          // Send plain text
          const payload = {
            number: finalPhone,
            options: { delay: 800, presence: "composing" },
            textMessage: { text: message || "" },
          };
          console.log(`[Evolution API] Sending text to ${finalPhone} via ${baseUrl}`);
          apiRes = await fetch(`${baseUrl}/message/sendText/${instance}`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });
        }

        const data: any = await apiRes.json().catch(() => ({}));
        console.log(`[Evolution API] Response:`, data);
        if (!apiRes.ok || data.error) {
          console.error(`[Evolution API] Error:`, data);
          return res.status(400).json({ message: data.error || data.message || "Evolution API gateway error", details: data });
        }
        logActivity(req, "SEND", "WhatsApp", undefined, `Sent WhatsApp ${document ? 'Document' : 'Message'} to ${finalPhone} via Evolution API`);
        return res.json({ success: true, mode: "evolution", messageId: data.key?.id || data.id });
      }

      if (mode === "ultramsg" && settings.whatsappInstanceId && settings.whatsappApiToken) {
        const { document, filename } = req.body;
        const payload: Record<string, string> = {
          token: settings.whatsappApiToken,
          to: finalPhone
        };

        let endpoint = "messages/chat";
        if (document) {
          endpoint = "messages/document";
          console.log(`[WhatsApp] Sending document to ${finalPhone}, document base64 length: ${document.length}`);
          const cleanDocument = document.includes("base64,") ? document.split("base64,")[1] : document;
          payload.document = cleanDocument;
          payload.caption = message || "";
          if (filename) payload.filename = filename;
        } else {
          console.log(`[WhatsApp] No document provided, sending chat message to ${finalPhone}`);
          payload.body = message || "";
        }

        console.log(`[WhatsApp] Hitting UltraMsg Endpoint: ${endpoint}`);
        const apiRes = await fetch(`https://api.ultramsg.com/${settings.whatsappInstanceId}/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data: any = await apiRes.json().catch(() => ({}));
        console.log(`[WhatsApp] UltraMsg API Response:`, data);
        if (!apiRes.ok || data.error) {
          console.error(`[WhatsApp] UltraMsg Error:`, data);
          return res.status(400).json({ message: data.error || data.message || "UltraMsg gateway error", details: data });
        }
        logActivity(req, "SEND", "WhatsApp", undefined, `Sent WhatsApp ${document ? 'Document' : 'Message'} to ${finalPhone} via UltraMsg`);
        return res.json({ success: true, mode: "ultramsg", messageId: data.id || data.sent });
      }

      if (mode === "custom" && settings.whatsappWebhookUrl) {
        const apiRes = await fetch(settings.whatsappWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: finalPhone, message: message || "" }),
        });
        const data: any = await apiRes.json().catch(() => ({}));
        if (!apiRes.ok) {
          return res.status(400).json({ message: "Custom WhatsApp webhook error", details: data });
        }
        logActivity(req, "SEND", "WhatsApp", undefined, `Sent WhatsApp to ${finalPhone} via Custom Webhook`);
        return res.json({ success: true, mode: "custom", response: data });
      }

      // Default: Direct WhatsApp Web / App Link
      const textParam = message ? `&text=${encodeURIComponent(message)}` : "";
      const waUrl = `https://api.whatsapp.com/send?phone=${finalPhone}${textParam}`;
      return res.json({ success: true, mode: "direct", url: waUrl });
    } catch (err: any) {
      console.error("WhatsApp API error:", err);
      res.status(500).json({ message: err.message || "Failed to send WhatsApp message" });
    }
  });

  // Backup Export (permission-based)
  app.get("/api/backup/export", requireAuth, requirePermission("backup.export"), async (_req, res) => {
    try {
      const [
        allOwners, allPets, allAppointments, allRecords, allFees, allInvoices, allRoles, allLabReports, allSettings, allInventory, allExpenses, allSuppliers, allPurchaseOrders, allEstimates, allPetDocs, allPurchases,
        allInvoiceItems, allEstimateItems, allPurchaseOrderItems, allPurchaseItems
      ] = await Promise.all([
        storage.getOwners().catch(() => []),
        storage.getPets().catch(() => []),
        storage.getAppointments().catch(() => []),
        storage.getMedicalRecords().catch(() => []),
        storage.getFeeStructures().catch(() => []),
        storage.getInvoices().catch(() => []),
        storage.getRoles().catch(() => []),
        storage.getAllLabReports().catch(() => []),
        storage.getClinicSettings().catch(() => []),
        storage.getInventoryItems().catch(() => []),
        storage.getExpenses().catch(() => []),
        storage.getSuppliers().catch(() => []),
        storage.getPurchaseOrders().catch(() => []),
        storage.getEstimates().catch(() => []),
        db.select().from(petDocuments).catch(() => []),
        storage.getPurchases().catch(() => []),
        db.select().from(invoiceItems).catch(() => []),
        db.select().from(estimateItems).catch(() => []),
        db.select().from(purchaseOrderItems).catch(() => []),
        db.select().from(purchaseItems).catch(() => []),
      ]);

      // Group invoice items by invoiceId in memory
      const invoiceItemsMap: Record<number, typeof allInvoiceItems> = {};
      for (const item of allInvoiceItems) {
        if (!invoiceItemsMap[item.invoiceId]) invoiceItemsMap[item.invoiceId] = [];
        invoiceItemsMap[item.invoiceId].push(item);
      }

      // Group estimate items by estimateId in memory
      const estimateItemsMap: Record<number, typeof allEstimateItems> = {};
      for (const item of allEstimateItems) {
        if (!estimateItemsMap[item.estimateId]) estimateItemsMap[item.estimateId] = [];
        estimateItemsMap[item.estimateId].push(item);
      }

      // Group purchase order items by purchaseOrderId in memory
      const purchaseOrderItemsMap: Record<number, typeof allPurchaseOrderItems> = {};
      for (const item of allPurchaseOrderItems) {
        if (!purchaseOrderItemsMap[item.purchaseOrderId]) purchaseOrderItemsMap[item.purchaseOrderId] = [];
        purchaseOrderItemsMap[item.purchaseOrderId].push(item);
      }

      // Group purchase items by purchaseId in memory
      const purchaseItemsMap: Record<number, typeof allPurchaseItems> = {};
      for (const item of allPurchaseItems) {
        if (!purchaseItemsMap[item.purchaseId]) purchaseItemsMap[item.purchaseId] = [];
        purchaseItemsMap[item.purchaseId].push(item);
      }

      const invoicesWithItems = allInvoices.map((inv) => ({
        ...inv,
        items: invoiceItemsMap[inv.id] || [],
      }));

      const estimatesWithItems = allEstimates.map((est) => ({
        ...est,
        items: estimateItemsMap[est.id] || [],
      }));

      const purchaseOrdersWithItems = allPurchaseOrders.map((po) => ({
        ...po,
        items: purchaseOrderItemsMap[po.id] || [],
      }));

      const purchasesWithItems = allPurchases.map((p) => ({
        ...p,
        items: purchaseItemsMap[p.id] || [],
      }));

      const settingsMap: Record<string, string> = {};
      for (const s of allSettings) {
        settingsMap[s.settingKey] = s.settingValue;
      }

      const backup = {
        exportDate: new Date().toISOString(),
        version: "2.1",
        data: {
          owners: allOwners,
          pets: allPets,
          appointments: allAppointments,
          medicalRecords: allRecords,
          feeStructures: allFees,
          invoices: invoicesWithItems,
          estimates: estimatesWithItems,
          petDocuments: allPetDocs,
          roles: allRoles,
          labReports: allLabReports,
          clinicSettings: settingsMap,
          inventoryItems: allInventory,
          expenses: allExpenses,
          suppliers: allSuppliers,
          purchaseOrders: purchaseOrdersWithItems,
          purchases: purchasesWithItems,
        },
      };

      const filename = `petpoint-backup-${new Date().toISOString().split("T")[0]}.json`;
      const jsonBody = JSON.stringify(backup);

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", Buffer.byteLength(jsonBody, "utf8"));
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.status(200).send(jsonBody);
    } catch (err: any) {
      console.error("[backup/export] Error:", err);
      res.status(500).json({ message: "Backup export failed: " + (err?.message || "Unknown error") });
    }
  });


  // SQL dumps operate on the shared database, so they cannot be exposed per clinic.
  app.get("/api/backup/export-sql", requireAuth, requirePermission("data.erase"), (_req, res) =>
    res.status(410).json({ message: "Shared-database SQL backups are disabled. Use the clinic-scoped JSON backup." })
  );
  app.post("/api/backup/restore-sql", requireAuth, requirePermission("data.erase"), (_req, res) =>
    res.status(410).json({ message: "Shared-database SQL restores are disabled. Use the clinic-scoped JSON backup." })
  );

  // Backup Restore (superadmin only)
  app.post("/api/backup/restore", requireAuth, requirePermission("data.erase"), async (req, res) => {
    try {
      const backup = req.body;
      if (!backup || !backup.data) {
        return res.status(400).json({ message: "Invalid backup file format" });
      }

      const removeTenantIds = (value: any): any => {
        if (Array.isArray(value)) return value.map(removeTenantIds);
        if (!value || typeof value !== "object") return value;
        const { tenantId: _tenantId, ...rest } = value;
        return Object.fromEntries(Object.entries(rest).map(([key, child]) => [key, removeTenantIds(child)]));
      };
      const data = removeTenantIds(backup.data);
      const counts: Record<string, number> = {};

      // Clear existing data (order matters due to foreign keys)
      await storage.eraseAllLabReports();
      await storage.eraseAllData(); // clears medical records, appointments, invoice items, invoices, pets, owners, etc.
      // Keep PostgreSQL sequences global and monotonic across every clinic.


      const roleMap = new Map<number, number>();
      const supplierMap = new Map<number, number>();
      const inventoryMap = new Map<number, number>();
      const ownerMap = new Map<number, number>();
      const petMap = new Map<number, number>();
      const feeMap = new Map<number, number>();

      // Restore roles (skip system roles that exist)
      if (data.roles && Array.isArray(data.roles)) {
        for (const role of data.roles) {
          const existing = await storage.getRoleByName(role.name);
          let newRole;
          if (!existing) {
            newRole = await storage.createRole({ name: role.name, permissions: role.permissions || [], isSystem: role.isSystem || "false" });
          } else {
            newRole = existing;
          }
          roleMap.set(role.id, newRole.id);
        }
        counts.roles = data.roles.length;
      }

      // Restore suppliers first (needed for inventory)
      if (data.suppliers && Array.isArray(data.suppliers)) {
        for (const s of data.suppliers) {
          const { id, createdAt, ...sData } = s;
          const originalCreatedAt = s.createdAt || null;
          const newSupplier = await storage.createSupplier(sData);
          supplierMap.set(id, newSupplier.id);
          if (originalCreatedAt) {
            try {
              await db.execute(sqlTag`UPDATE suppliers SET created_at = ${new Date(originalCreatedAt)} WHERE id = ${newSupplier.id}`);
            } catch (e) {
              console.warn("[Restore] Could not restore createdAt for supplier:", e);
            }
          }
        }
        counts.suppliers = data.suppliers.length;
      }

      // Restore inventory (needed for invoices/POs)
      if (data.inventoryItems && Array.isArray(data.inventoryItems)) {
        for (const item of data.inventoryItems) {
          const { id, productId, ...itemData } = item;
          // Ensure lastUpdated is present to satisfy not-null constraint
          if (!itemData.lastUpdated) {
            itemData.lastUpdated = new Date().toISOString();
          }
          // Remap supplierId
          if (itemData.supplierId && supplierMap.has(itemData.supplierId)) {
            itemData.supplierId = supplierMap.get(itemData.supplierId);
          }
          const newItem = await storage.createInventoryItem(itemData);
          inventoryMap.set(id, newItem.id);
        }
        counts.inventoryItems = data.inventoryItems.length;
      }

      // Restore fee structures
      if (data.feeStructures && Array.isArray(data.feeStructures)) {
        for (const fee of data.feeStructures) {
          const { id, ...feeData } = fee;
          const newFee = await storage.createFeeStructure(feeData);
          feeMap.set(id, newFee.id);
        }
        counts.feeStructures = data.feeStructures.length;
      }

      // Restore owners
      if (data.owners && Array.isArray(data.owners)) {
        for (const owner of data.owners) {
          const { id, createdAt, ...ownerData } = owner;
          const newOwner = await storage.createOwner(ownerData);
          ownerMap.set(id, newOwner.id);
        }
        counts.owners = data.owners.length;
      }

      // Restore pets (need to map owner IDs)
      if (data.pets && Array.isArray(data.pets)) {
        for (const pet of data.pets) {
          const { id, createdAt, ...petData } = pet;
          const originalCreatedAt = pet.createdAt || null;
          
          // Remap ownerId using map
          if (ownerMap.has(pet.ownerId)) {
            petData.ownerId = ownerMap.get(pet.ownerId);
          } else {
            // Fallback: try fuzzy match if map fails (unlikely)
            const originalOwner = data.owners?.find((o: any) => o.id === pet.ownerId);
            if (originalOwner) {
              const newOwners = await storage.getOwners();
              const matchedOwner = newOwners.find(o => o.firstName === originalOwner.firstName && o.phone === originalOwner.phone);
              if (matchedOwner) petData.ownerId = matchedOwner.id;
            }
          }

          const newPet = await storage.createPet(petData);
          petMap.set(id, newPet.id);

          if (originalCreatedAt) {
            try {
              await db.execute(sqlTag`UPDATE pets SET created_at = ${new Date(originalCreatedAt)} WHERE id = ${newPet.id}`);
            } catch (e) {
              console.warn("[Restore] Could not restore createdAt for pet:", e);
            }
          }
        }
        counts.pets = data.pets.length;
        invalidateDataCache("owners", "pets"); // flush cache after bulk restore
      }

      // Restore appointments
      if (data.appointments && Array.isArray(data.appointments)) {
        for (const apt of data.appointments) {
          const { id, ...aptData } = apt;
          // Remap petId and ownerId
          if (petMap.has(apt.petId)) aptData.petId = petMap.get(apt.petId);
          if (ownerMap.has(apt.ownerId)) aptData.ownerId = ownerMap.get(apt.ownerId);
          
          await storage.createAppointment(aptData);
        }
        counts.appointments = data.appointments.length;
      }

      // Restore medical records
      if (data.medicalRecords && Array.isArray(data.medicalRecords)) {
        for (const rec of data.medicalRecords) {
          const { id, createdAt, ...recData } = rec;
          const originalCreatedAt = rec.createdAt || null;
          // Remap petId
          if (petMap.has(rec.petId)) recData.petId = petMap.get(rec.petId);
          
          const newRec = await storage.createMedicalRecord(recData);
          if (originalCreatedAt) {
            try {
              await db.execute(sqlTag`UPDATE medical_records SET created_at = ${new Date(originalCreatedAt)} WHERE id = ${newRec.id}`);
            } catch (e) {
              console.warn("[Restore] Could not restore createdAt for medical record:", e);
            }
          }
        }
        counts.medicalRecords = data.medicalRecords.length;
      }

      // Restore invoices â€” preserve original createdAt timestamps
      if (data.invoices && Array.isArray(data.invoices)) {
        for (const inv of data.invoices) {
          const { id, items, createdByName, billedByName, ...invData } = inv;

          // Prevent duplication: check if invoice already exists
          const existingInv = await db.select().from(invoices).where(eq(invoices.invoiceNumber, inv.invoiceNumber));
          if (existingInv.length > 0) {
            console.log(`[Restore] Skipping duplicate invoice ${inv.invoiceNumber}`);
            continue;
          }

          const originalCreatedAt: string | null = inv.createdAt || null;
          const { createdAt: _ca, ...invDataWithoutDate } = invData;

          // Remap IDs
          if (ownerMap.has(inv.ownerId)) invDataWithoutDate.ownerId = ownerMap.get(inv.ownerId);
          if (inv.petId && petMap.has(inv.petId)) invDataWithoutDate.petId = petMap.get(inv.petId);

          const newInv = await storage.createInvoice(invDataWithoutDate);

          if (originalCreatedAt) {
            try {
              await db.execute(sqlTag`UPDATE invoices SET created_at = ${new Date(originalCreatedAt)} WHERE id = ${newInv.id}`);
            } catch (e) {
              console.warn(`[Restore] Could not restore createdAt for invoice ${newInv.id}:`, e);
            }
          }

          if (items && Array.isArray(items)) {
            for (const item of items) {
              const { id: itemId, ...itemData } = item;
              // Remap inventoryId and feeId
              if (itemData.inventoryId && inventoryMap.has(itemData.inventoryId)) {
                itemData.inventoryId = inventoryMap.get(itemData.inventoryId);
              }
              if (itemData.feeId && feeMap.has(itemData.feeId)) {
                itemData.feeId = feeMap.get(itemData.feeId);
              }
              await storage.createInvoiceItem({ ...itemData, invoiceId: newInv.id });
            }
          }
        }
        counts.invoices = data.invoices.length;
      }

      // Restore estimates
      if (data.estimates && Array.isArray(data.estimates)) {
        for (const est of data.estimates) {
          const { id, items, createdAt, ...estData } = est;
          const originalCreatedAt = est.createdAt || null;
          const newEst = await storage.createEstimate(estData);
          if (originalCreatedAt) {
            try {
              await db.execute(sqlTag`UPDATE estimates SET created_at = ${new Date(originalCreatedAt)} WHERE id = ${newEst.id}`);
            } catch (e) {
              console.warn("[Restore] Could not restore createdAt for estimate:", e);
            }
          }
          if (items && Array.isArray(items)) {
            for (const item of items) {
              const { id: itemId, ...itemData } = item;
              // Remap IDs
              if (itemData.inventoryId && inventoryMap.has(itemData.inventoryId)) {
                itemData.inventoryId = inventoryMap.get(itemData.inventoryId);
              }
              if (itemData.feeId && feeMap.has(itemData.feeId)) {
                itemData.feeId = feeMap.get(itemData.feeId);
              }
              await storage.createEstimateItem({ ...itemData, estimateId: newEst.id });
            }
          }
        }
        counts.estimates = data.estimates.length;
      }

      // Restore pet documents
      if (data.petDocuments && Array.isArray(data.petDocuments)) {
        for (const doc of data.petDocuments) {
          const { id, uploadedAt, ...docData } = doc;
          const originalUploadedAt = doc.uploadedAt || null;

          // Remap petId
          if (petMap.has(doc.petId)) docData.petId = petMap.get(doc.petId);

          const newDoc = await storage.createPetDocument(docData);
          if (originalUploadedAt) {
            try {
              await db.execute(sqlTag`UPDATE pet_documents SET uploaded_at = ${new Date(originalUploadedAt)} WHERE id = ${newDoc.id}`);
            } catch (e) {
              console.warn("[Restore] Could not restore uploadedAt for document:", e);
            }
          }
        }
        counts.petDocuments = data.petDocuments.length;
      }

      // Restore lab reports
      if (data.labReports && Array.isArray(data.labReports)) {
        for (const report of data.labReports) {
          const { id, createdAt, ...reportData } = report;
          const originalCreatedAt = report.createdAt || null;
          // Remap petId
          if (petMap.has(report.petId)) reportData.petId = petMap.get(report.petId);

          const newReport = await storage.createLabReport(reportData);
          if (originalCreatedAt) {
            try {
              await db.execute(sqlTag`UPDATE lab_reports SET created_at = ${new Date(originalCreatedAt)} WHERE id = ${newReport.id}`);
            } catch (e) {
              console.warn("[Restore] Could not restore createdAt for lab report:", e);
            }
          }
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

      // Restore purchase orders
      if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
        for (const po of data.purchaseOrders) {
          const { id, items, ...poData } = po;
          // Remap supplierId
          if (poData.supplierId && supplierMap.has(poData.supplierId)) {
            poData.supplierId = supplierMap.get(poData.supplierId);
          }
          const newPO = await storage.createPurchaseOrder(poData);
          if (items && Array.isArray(items)) {
            for (const item of items) {
              const { id: itemId, ...itemData } = item;
              // Remap inventoryItemId
              if (itemData.inventoryItemId && inventoryMap.has(itemData.inventoryItemId)) {
                itemData.inventoryItemId = inventoryMap.get(itemData.inventoryItemId);
              }
              await storage.createPurchaseOrderItem({ ...itemData, purchaseOrderId: newPO.id });
            }
          }
        }
        counts.purchaseOrders = data.purchaseOrders.length;
      }

      // Restore purchases
      if (data.purchases && Array.isArray(data.purchases)) {
        for (const p of data.purchases) {
          const { id, items, createdAt, ...pData } = p;
          const originalCreatedAt = p.createdAt || null;
          // Remap supplierId
          if (pData.supplierId && supplierMap.has(pData.supplierId)) {
            pData.supplierId = supplierMap.get(pData.supplierId);
          }
          const newPurchase = await storage.createPurchase(pData);
          if (originalCreatedAt) {
            try {
              await db.execute(sqlTag`UPDATE purchases SET created_at = ${new Date(originalCreatedAt)} WHERE id = ${newPurchase.id}`);
            } catch (e) {
              console.warn("[Restore] Could not restore createdAt for purchase:", e);
            }
          }
          if (items && Array.isArray(items)) {
            for (const item of items) {
              const { id: itemId, ...itemData } = item;
              // Remap inventoryItemId
              if (itemData.inventoryItemId && inventoryMap.has(itemData.inventoryItemId)) {
                itemData.inventoryItemId = inventoryMap.get(itemData.inventoryItemId);
              }
              await storage.createPurchaseItem({ ...itemData, purchaseId: newPurchase.id });
            }
          }
        }
        counts.purchases = data.purchases.length;
      }

      // Restore expenses
      if (data.expenses && Array.isArray(data.expenses)) {
        for (const exp of data.expenses) {
          const { id, ...expData } = exp;
          await storage.createExpense(expData);
        }
        counts.expenses = data.expenses.length;
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

    // Today in IST (YYYY-MM-DD) â€” used for both date field and createdAt comparison
    const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const paidInvoices = allInvoices.filter((inv) => inv.status === "paid");

    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (parseFloat(String(inv.total || "0")) || 0), 0);

    // Today's revenue: match on the date field
    const todayRevenue = paidInvoices
      .filter((inv) => inv.date === todayIST)
      .reduce((sum, inv) => sum + (parseFloat(String(inv.total || "0")) || 0), 0);

    const pendingInvoices = allInvoices.filter((inv) => inv.status === "pending").length;

    res.json({
      totalRevenue,
      todayRevenue,
      totalUsers: allUsers.length,
      pendingInvoices,
    });
  });


  // The following inventory routes have been moved to ./routes/inventory.ts
  registerInventoryRoutes(app);

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
  app.get("/api/purchase-orders", requireAuth, requirePermission("purchase.view", "purchase.manage"), async (_req, res) => {
    const all = await storage.getPurchaseOrders();
    res.json(all);
  });

  app.get("/api/purchase-orders/next-number", requireAuth, async (_req, res) => {
    const num = await storage.getNextPurchaseOrderNumber();
    res.json({ orderNumber: num });
  });

  app.get("/api/purchase-orders/:id", requireAuth, requirePermission("purchase.view", "purchase.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    const po = await storage.getPurchaseOrder(id);
    if (!po) return res.status(404).json({ message: "Purchase order not found" });
    const items = await storage.getPurchaseOrderItems(id);
    res.json({ ...po, items });
  });

  app.post("/api/purchase-orders", requireAuth, requirePermission("purchase.create", "purchase.manage"), async (req, res) => {
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

  app.delete("/api/purchase-orders/:id", requireAuth, requirePermission("purchase.delete", "purchase.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    logActivity(req, "DELETE", "Purchase Order", id, "Deleted purchase order");
    await storage.deletePurchaseOrder(id);
    res.sendStatus(204);
  });

  // --- Tax Category Routes ---
  app.get("/api/tax-categories", requireAuth, async (_req, res) => {
    const all = await storage.getTaxCategories();
    res.json(all);
  });

  app.post("/api/tax-categories", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const data = insertTaxCategorySchema.parse(req.body);
    const tax = await storage.createTaxCategory(data);
    logActivity(req, "CREATE", "Tax Category", tax.id, `Added tax category "${tax.name}"`);
    res.status(201).json(tax);
  });

  app.patch("/api/tax-categories/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    const data = insertTaxCategorySchema.partial().parse(req.body);
    const updated = await storage.updateTaxCategory(id, data);
    logActivity(req, "UPDATE", "Tax Category", id, `Updated tax category "${updated?.name}"`);
    res.json(updated);
  });

  app.delete("/api/tax-categories/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    logActivity(req, "DELETE", "Tax Category", id, "Deleted tax category");
    await storage.deleteTaxCategory(id);
    res.sendStatus(204);
  });

  // Receive Purchase Order â†’ update inventory quantities
  app.post("/api/purchase-orders/:id/receive", requireAuth, requirePermission("purchase.edit", "purchase.manage"), async (req, res) => {
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
          purchasePrice: String(poItem.unitPrice),
          mrp: String(poItem.mrp),
          taxCategoryId: poItem.taxCategoryId || invItem.taxCategoryId,
          // Automatically sync sale price to MRP if needed, but here we just update MRP
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    logActivity(req, "RECEIVE", "Purchase Order", id, `Received PO #${po.orderNumber} with ${items.length} items`);
    const updated = await storage.updatePurchaseOrder(id, {
      status: "received",
      receiveddate: istToday(),
    });

    // Auto-create Ledger Entry for Purchase
    const supplier = po.supplierId ? await storage.getSupplier(po.supplierId) : null;
    const existingLedger = await storage.getLedgerEntryByReference("purchase_order", po.id);
    if (!existingLedger) {
      const vNum = await storage.getNextVoucherNumber("purchase");
      await storage.createLedgerEntry({
        date: updated!.receivedDate || istToday(),
        voucherNumber: vNum,
        type: "purchase",
        category: "Inventory Purchase",
        description: `Payment for Purchase Order ${po.orderNumber}`,
        party: supplier ? supplier.name : "Unknown Supplier",
        referenceType: "purchase_order",
        referenceId: po.id,
        referenceNumber: po.orderNumber,
        debitAmount: "0",
        creditAmount: String(po.totalAmount),
        paymentMethod: "bank", // default for POs typically
        createdBy: (req.session as any)?.userId,
      });
    }

    res.json(updated);
  });

  app.delete("/api/purchase-orders/:id", requireAuth, requirePermission("purchase.delete", "purchase.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    logActivity(req, "DELETE", "Purchase Order", id, "Deleted purchase order");
    await storage.deletePurchaseOrder(id);
    res.sendStatus(204);
  });

  // Convert PO to Purchase (Receive)
  app.post("/api/purchase-orders/:id/convert-to-purchase", requireAuth, requirePermission("purchase.create", "purchase.manage"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const po = await storage.getPurchaseOrder(id);
      if (!po) return res.status(404).json({ message: "Purchase order not found" });
      if (po.status === "received") return res.status(400).json({ message: "Already converted/received" });

      const poItems = await storage.getPurchaseOrderItems(id);
      
      // Create actual Purchase record
      const purchase = await storage.createPurchase({
        purchaseNumber: `#TEMP-${Date.now()}`,
        orderId: po.id,
        supplierId: po.supplierId,
        date: istToday(),
        status: "completed",
        totalAmount: po.totalAmount,
        notes: po.notes,
        createdBy: (req.session as any)?.userId,
      });

      for (const poItem of poItems) {
        await storage.createPurchaseItem({
          purchaseId: purchase.id,
          inventoryItemId: poItem.inventoryItemId,
          quantity: poItem.quantity,
          unitPrice: poItem.unitPrice,
          unit: poItem.unit,
          mrp: poItem.mrp,
          sgstRate: poItem.sgstRate,
          cgstRate: poItem.cgstRate,
          sgstAmount: poItem.sgstAmount,
          cgstAmount: poItem.cgstAmount,
          total: poItem.total,
        });

        // Update inventory
        const invItem = await storage.getInventoryItem(poItem.inventoryItemId);
        if (invItem) {
          await storage.updateInventoryItem(invItem.id, {
            quantity: invItem.quantity + poItem.quantity,
            purchasePrice: String(poItem.unitPrice),
            mrp: String(poItem.mrp),
            lastUpdated: new Date().toISOString(),
          });
        }
      }

      // Mark PO as received
      await storage.updatePurchaseOrder(id, {
        status: "received",
        receiveddate: istToday(),
      });

      // Ledger Entry for Purchase
      const supplier = await storage.getSupplier(po.supplierId);
      const vNum = await storage.getNextVoucherNumber("purchase");
      await storage.createLedgerEntry({
        date: istToday(),
        voucherNumber: vNum,
        type: "purchase",
        category: "Inventory Purchase",
        description: `Payment for Purchase ${purchase.purchaseNumber} (from PO ${po.orderNumber})`,
        party: supplier ? supplier.name : "Unknown Supplier",
        referenceType: "purchase",
        referenceId: purchase.id,
        referenceNumber: purchase.purchaseNumber,
        debitAmount: "0",
        creditAmount: String(purchase.totalAmount),
        paymentMethod: "bank",
        createdBy: (req.session as any)?.userId,
      });

      logActivity(req, "CONVERT", "Purchase Order", id, `Converted PO #${po.orderNumber} to Purchase #${purchase.purchaseNumber}`);
      res.status(201).json({ purchase, orderId: id });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Purchases API
  app.get("/api/purchases", requireAuth, requirePermission("purchase.view", "purchase.manage"), async (_req, res) => {
    const all = await storage.getPurchases();
    res.json(all);
  });

  app.get("/api/purchases/next-number", requireAuth, async (_req, res) => {
    const num = await storage.getNextPurchaseNumber();
    res.json({ purchaseNumber: num });
  });

  app.get("/api/purchases/:id", requireAuth, requirePermission("purchase.view", "purchase.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    const p = await storage.getPurchase(id);
    if (!p) return res.status(404).json({ message: "Purchase not found" });
    const items = await storage.getPurchaseItems(id);
    res.json({ ...p, items });
  });

  app.post("/api/purchases", requireAuth, requirePermission("purchase.create", "purchase.manage"), async (req, res) => {
    try {
      const { items, ...purchaseData } = req.body;
      const data = insertPurchaseSchema.parse(purchaseData);
      const p = await storage.createPurchase(data);
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const pItem = insertPurchaseItemSchema.parse({
            ...item,
            purchaseId: p.id,
          });
          await storage.createPurchaseItem(pItem);

          // Update inventory
          const invItem = await storage.getInventoryItem(item.inventoryItemId);
          if (invItem) {
            await storage.updateInventoryItem(invItem.id, {
              quantity: invItem.quantity + item.quantity,
              purchasePrice: String(item.unitPrice),
              mrp: String(item.mrp),
              lastUpdated: new Date().toISOString(),
            });
          }
        }
      }

      // Ledger Entry for direct Purchase
      const supplier = await storage.getSupplier(p.supplierId);
      const vNum = await storage.getNextVoucherNumber("purchase");
      await storage.createLedgerEntry({
        date: p.date,
        voucherNumber: vNum,
        type: "purchase",
        category: "Inventory Purchase",
        description: `Direct Purchase ${p.purchaseNumber}`,
        party: supplier ? supplier.name : "Unknown Supplier",
        referenceType: "purchase",
        referenceId: p.id,
        referenceNumber: p.purchaseNumber,
        debitAmount: "0",
        creditAmount: String(p.totalAmount),
        paymentMethod: "bank",
        createdBy: (req.session as any)?.userId,
      });

      const allItems = await storage.getPurchaseItems(p.id);
      logActivity(req, "CREATE", "Purchase", p.id, `Created Purchase #${p.purchaseNumber}`);
      res.status(201).json({ ...p, items: allItems });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/purchases/:id", requireAuth, requirePermission("purchase.delete", "purchase.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    logActivity(req, "DELETE", "Purchase", id, "Deleted purchase record");
    
    // Reverse inventory update
    const items = await storage.getPurchaseItems(id);
    for (const item of items) {
      const invItem = await storage.getInventoryItem(item.inventoryItemId);
      if (invItem) {
        await storage.updateInventoryItem(invItem.id, {
          quantity: Math.max(0, invItem.quantity - item.quantity),
        });
      }
    }

    await storage.deletePurchase(id);
    res.sendStatus(204);
  });

  // --- Inventory Metadata (Units, Categories, Sub-categories) ---
  app.get("/api/inventory-units", requireAuth, async (_req, res) => {
    const units = await storage.getInventoryUnits();
    res.json(units);
  });

  app.post("/api/inventory-units", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const parsed = insertInventoryUnitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const unit = await storage.createInventoryUnit(parsed.data);
    logActivity(req, "CREATE", "Inventory Unit", unit.id, `Created unit "${unit.name}"`);
    res.status(201).json(unit);
  });

  app.delete("/api/inventory-units/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteInventoryUnit(id);
    logActivity(req, "DELETE", "Inventory Unit", id, "Deleted inventory unit");
    res.sendStatus(204);
  });

  app.get("/api/inventory-categories", requireAuth, async (_req, res) => {
    const categories = await storage.getInventoryCategories();
    res.json(categories);
  });

  app.post("/api/inventory-categories", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const parsed = insertInventoryCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const category = await storage.createInventoryCategory(parsed.data);
    logActivity(req, "CREATE", "Inventory Category", category.id, `Created category "${category.name}"`);
    res.status(201).json(category);
  });

  app.delete("/api/inventory-categories/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteInventoryCategory(id);
    logActivity(req, "DELETE", "Inventory Category", id, "Deleted inventory category");
    res.sendStatus(204);
  });

  app.get("/api/inventory-product-types", requireAuth, async (_req, res) => {
    const types = await storage.getInventoryProductTypes();
    res.json(types);
  });

  app.post("/api/inventory-product-types", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const parsed = insertInventoryProductTypeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const productType = await storage.createInventoryProductType(parsed.data);
    logActivity(req, "CREATE", "Inventory Product Type", productType.id, `Created product type "${productType.name}"`);
    res.status(201).json(productType);
  });

  app.delete("/api/inventory-product-types/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteInventoryProductType(id);
    logActivity(req, "DELETE", "Inventory Product Type", id, "Deleted inventory product type");
    res.sendStatus(204);
  });


  app.get("/api/inventory-sub-categories", requireAuth, async (_req, res) => {
    const subs = await storage.getInventorySubCategories();
    res.json(subs);
  });

  app.post("/api/inventory-sub-categories", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const parsed = insertInventorySubCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const sub = await storage.createInventorySubCategory(parsed.data);
    logActivity(req, "CREATE", "Inventory Sub Category", sub.id, `Created sub-category "${sub.name}"`);
    res.status(201).json(sub);
  });

  app.delete("/api/inventory-sub-categories/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteInventorySubCategory(id);
    logActivity(req, "DELETE", "Inventory Sub Category", id, "Deleted inventory sub-category");
    res.sendStatus(204);
  });

  // --- Tax Category Routes ---
  app.get("/api/tax-categories", requireAuth, async (_req, res) => {
    const all = await storage.getTaxCategories();
    res.json(all);
  });

  app.post("/api/tax-categories", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const parsed = insertTaxCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const category = await storage.createTaxCategory(parsed.data);
    logActivity(req, "CREATE", "Tax Category", category.id, `Created tax category "${category.name}"`);
    res.status(201).json(category);
  });

  app.patch("/api/tax-categories/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    const parsed = insertTaxCategorySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateTaxCategory(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Tax category not found" });
    logActivity(req, "UPDATE", "Tax Category", id, `Updated tax category "${updated.name}"`);
    res.json(updated);
  });

  app.delete("/api/tax-categories/:id", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteTaxCategory(id);
    logActivity(req, "DELETE", "Tax Category", id, "Deleted tax category");
    res.sendStatus(204);
  });

  // --- Expense Category Routes ---
  app.get("/api/expense-categories", requireAuth, async (_req, res) => {
    const all = await storage.getExpenseCategories();
    res.json(all);
  });

  app.post("/api/expense-categories", requireAuth, async (req, res) => {
    const parsed = insertExpenseCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const category = await storage.createExpenseCategory(parsed.data);
    logActivity(req, "CREATE", "Expense Category", category.id, `Created expense category "${category.category}"`);
    res.status(201).json(category);
  });

  app.patch("/api/expense-categories/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    const parsed = insertExpenseCategorySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateExpenseCategory(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Expense category not found" });
    logActivity(req, "UPDATE", "Expense Category", id, `Updated expense category "${updated.category}"`);
    res.json(updated);
  });

  app.delete("/api/expense-categories/:id", requireAuth, async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteExpenseCategory(id);
    logActivity(req, "DELETE", "Expense Category", id, "Deleted expense category");
    res.sendStatus(204);
  });

  app.post("/api/expense-categories/seed", requireAuth, async (req, res) => {
    try {
      const DEFAULT_EXPENSE_CATEGORIES = [
        { cat: "Clinical/Medical", subs: ["Medicines & Pharmaceuticals", "Vaccines & Biologicals", "Surgical Supplies & Consumables", "Diagnostic Supplies (lab reagents, test kits, X-ray films)", "Medical Equipment (purchase/lease)", "Equipment Maintenance & Calibration"] },
        { cat: "Operational", subs: ["Rent / Lease", "Utilities", "Staff Salaries & Wages", "Staff Benefits", "Cleaning & Sanitation Supplies", "Waste Disposal"] },
        { cat: "Administrative", subs: ["Office Supplies & Stationery", "Software/Subscriptions", "Insurance", "Licenses & Regulatory Fees", "Bank Charges / Payment Gateway Fees"] },
        { cat: "Facility", subs: ["Repairs & Maintenance", "Furniture & Fixtures", "Vehicle Expenses"] },
        { cat: "Marketing & Growth", subs: ["Advertising", "Website/SEO", "Client Communication Tools"] },
        { cat: "Miscellaneous", subs: ["Training & CE", "Donations/CSR", "Petty Cash", "Others"] }
      ];

      const existingCats = await storage.getExpenseCategories();
      const existingMap = new Set(existingCats.map(c => `${c.category}|${c.subCategory}`));

      let added = 0;
      for (const group of DEFAULT_EXPENSE_CATEGORIES) {
        for (const sub of group.subs) {
          if (!existingMap.has(`${group.cat}|${sub}`)) {
            await storage.createExpenseCategory({
              category: group.cat,
              subCategory: sub,
              description: `Default category for ${sub}`
            });
            added++;
          }
        }
      }

      logActivity(req, "CREATE", "Expense Category", 0, `Seeded ${added} default expense categories`);
      res.json({ message: `Successfully added ${added} categories.` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Migrate Clinical/Medical subcategories to full descriptive names ────────
  app.post("/api/expense-categories/migrate-clinical", requireAuth, async (req, res) => {
    try {
      const RENAME_MAP = [
        { old: "Diagnostic Supplies",  full: "Diagnostic Supplies (lab reagents, test kits, X-ray films)" },
        { old: "Medical Equipment",    full: "Medical Equipment (purchase/lease)" },
      ];

      const CLINICAL_REQUIRED = [
        "Medicines & Pharmaceuticals",
        "Vaccines & Biologicals",
        "Surgical Supplies & Consumables",
        "Diagnostic Supplies (lab reagents, test kits, X-ray films)",
        "Medical Equipment (purchase/lease)",
        "Equipment Maintenance & Calibration",
      ];

      const allCats = await storage.getExpenseCategories();
      const clinical = allCats.filter(c => c.category === "Clinical/Medical");
      let updated = 0;
      let added = 0;

      // Rename abbreviated entries to full names
      for (const { old: oldName, full: fullName } of RENAME_MAP) {
        const existing = clinical.find(c => c.subCategory === oldName);
        if (existing) {
          await storage.updateExpenseCategory(existing.id, {
            category: "Clinical/Medical",
            subCategory: fullName,
            description: `Default category for ${fullName}`,
          });
          updated++;
        }
      }

      // Re-fetch after updates
      const refreshed = await storage.getExpenseCategories();
      const refreshedSet = new Set(
        refreshed.filter(c => c.category === "Clinical/Medical").map(c => c.subCategory)
      );

      // Insert any still-missing subcategories
      for (const sub of CLINICAL_REQUIRED) {
        if (!refreshedSet.has(sub)) {
          await storage.createExpenseCategory({
            category: "Clinical/Medical",
            subCategory: sub,
            description: `Default category for ${sub}`,
          });
          added++;
        }
      }

      logActivity(req, "UPDATE", "Expense Category", 0, `Migrated Clinical/Medical: ${updated} renamed, ${added} added`);
      res.json({ message: `Clinical/Medical updated: ${updated} renamed, ${added} newly added.` });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Seed default inventory units, categories, sub-categories ──────────────
  app.post("/api/inventory-settings/seed", requireAuth, requirePermission("inventory.manage"), async (req, res) => {
    try {
      const DEFAULT_UNITS = [
        "Tablet", "Capsule", "Strip", "Vial", "Ampoule", "Bottle",
        "Sachet", "Tube", "Box", "Pack", "Piece", "ml", "mg", "g", "kg",
      ];

      const DEFAULT_CATEGORIES_WITH_SUBS: { cat: string; subs: string[] }[] = [
        { cat: "Medicine",          subs: ["Antibiotic", "Antiparasitic", "Anti-inflammatory", "Vaccine", "Dewormer", "Vitamin & Supplement", "Antifungal", "Analgesic", "Hormonal", "Ophthalmic", "Ear Drop"] },
        { cat: "Surgical Supplies", subs: ["Sutures", "Gloves", "Syringes & Needles", "Bandage & Dressing", "Catheter", "Scalpel Blade", "Cotton & Gauze"] },
        { cat: "Feed & Nutrition",  subs: ["Dog Food", "Cat Food", "Puppy Food", "Kitten Food", "Supplement", "Treat"] },
        { cat: "Accessories",       subs: ["Collar & Leash", "Cage & Carrier", "Grooming", "Toy"] },
        { cat: "Lab Supplies",      subs: ["Test Kit", "Slide & Stain", "Reagent", "Collection Tube"] },
        { cat: "Consumables",       subs: ["Gloves", "Mask", "Syringe", "IV Fluid", "Infusion Set"] },
      ];

      const DEFAULT_PRODUCT_TYPES = [
        "Medicine", "Consumable", "Equipment", "Pet Food", "Other"
      ];

      const existingUnits = await storage.getInventoryUnits();
      const existingCats  = await storage.getInventoryCategories();
      const existingSubs  = await storage.getInventorySubCategories();
      const existingTypes = await storage.getInventoryProductTypes();

      const existingUnitNames = new Set(existingUnits.map(u => u.name.toLowerCase()));
      const existingSubNames  = new Set(existingSubs.map(s => s.name.toLowerCase()));
      const existingTypeNames = new Set(existingTypes.map(t => t.name.toLowerCase()));

      // Seed product types
      for (const name of DEFAULT_PRODUCT_TYPES) {
        if (!existingTypeNames.has(name.toLowerCase())) {
          await storage.createInventoryProductType({ name });
        }
      }

      // Seed units
      for (const name of DEFAULT_UNITS) {
        if (!existingUnitNames.has(name.toLowerCase())) {
          await storage.createInventoryUnit({ name });
        }
      }

      // Seed categories then sub-categories
      for (const { cat, subs } of DEFAULT_CATEGORIES_WITH_SUBS) {
        let catRecord = existingCats.find(c => c.name.toLowerCase() === cat.toLowerCase());
        if (!catRecord) {
          catRecord = await storage.createInventoryCategory({ name: cat });
        }
        const catId = catRecord!.id;
        for (const sub of subs) {
          if (!existingSubNames.has(sub.toLowerCase())) {
            await storage.createInventorySubCategory({ name: sub, category: cat, categoryId: catId });
            existingSubNames.add(sub.toLowerCase()); // track newly added so we don't dupe within the seed list
          }
        }
      }

      res.json({ message: "Default inventory settings seeded successfully." });
    } catch (err: any) {
      console.error("Seed error:", err);
      res.status(500).json({ message: err.message || "Seed failed" });
    }
  });

  // --- Reports Routes ---
  app.get("/api/reports/revenue-breakdown", requireAuth, requirePermission("inventory.view"), async (req, res) => {
    try {
      const startDate = String(req.query.from || istToday());
      const endDate = String(req.query.to || istToday());
      const data = await storage.getRevenueBreakdown(startDate, endDate);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // --- Accounts / Expenses Routes ---
  app.get("/api/ledger", requireAuth, requirePermission("accounts.view"), async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.startDate) filters.startDate = String(req.query.startDate);
      if (req.query.endDate) filters.endDate = String(req.query.endDate);
      if (req.query.type) filters.type = String(req.query.type);
      if (req.query.search) filters.search = String(req.query.search);

      const entries = await storage.getLedgerEntries(filters);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/ledger/:id", requireAuth, requirePermission("accounts.manage"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      await storage.deleteLedgerEntry(id);
      logActivity(req, "DELETE", "Ledger Entry", id, "Manually deleted ledger entry");
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/expenses", requireAuth, requirePermission("accounts.view"), async (_req, res) => {
    const expenses = await storage.getExpenses();
    res.json(expenses);
  });

  app.get("/api/expenses/next-voucher", requireAuth, requirePermission("accounts.view"), async (_req, res) => {
    const nextNum = await storage.getNextVoucherNumber("expense");
    res.json({ voucherNumber: nextNum });
  });

  app.post("/api/expenses", requireAuth, requirePermission("accounts.manage"), async (req, res) => {
    const data = insertExpenseSchema.parse(req.body);
    const expense = await storage.createExpense(data);
    
    // Auto-create Ledger Entry for Expense
    const existingLedger = await storage.getLedgerEntryByReference("expense", expense.id);
    if (!existingLedger) {
      const vNum = expense.voucherNumber || await storage.getNextVoucherNumber("expense");
      await storage.createLedgerEntry({
        date: expense.date,
        voucherNumber: vNum,
        type: "expense",
        category: expense.category,
        description: expense.description,
        party: "Expense",
        referenceType: "expense",
        referenceId: expense.id,
        referenceNumber: undefined,
        debitAmount: "0",
        creditAmount: String(expense.amount),
        paymentMethod: expense.paymentMethod || "cash",
        createdBy: (req.session as any)?.userId,
      });
    }

    logActivity(req, "CREATE", "Expense", expense.id, `Added expense: ${expense.description} (${expense.amount})`);
    res.status(201).json(expense);
  });

  app.delete("/api/expenses/:id", requireAuth, requirePermission("accounts.manage"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    
    // Also remove from ledger
    const ledgerEntry = await storage.getLedgerEntryByReference("expense", id);
    if (ledgerEntry) {
      await storage.deleteLedgerEntry(ledgerEntry.id);
    }

    logActivity(req, "DELETE", "Expense", id, "Deleted expense");
    await storage.deleteExpense(id);
    res.sendStatus(204);
  });

  // Lab Reports
  app.get("/api/pets/:id/lab-reports", requireAuth, requirePermission("medical_records.view"), async (req, res) => {
    const id = parseInt(String(req.params.id));
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
      const id = parseInt(String(req.params.id));
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
    const id = parseInt(String(req.params.id));
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
    const id = parseInt(String(req.params.id));
    const parsed = insertLabCategorySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateLabCategory(id, parsed.data);
    logActivity(req, "UPDATE", "Lab Category", id, `Updated lab category`);
    res.json(updated);
  });

  app.delete("/api/lab-settings/categories/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(String(req.params.id));
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
    const id = parseInt(String(req.params.id));
    const parsed = insertLabTestSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateLabTest(id, parsed.data);
    res.json(updated);
  });

  app.delete("/api/lab-settings/tests/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(String(req.params.id));
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
    const id = parseInt(String(req.params.id));
    const parsed = insertLabRefRangeSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateLabRefRange(id, parsed.data);
    res.json(updated);
  });

  app.delete("/api/lab-settings/ranges/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(String(req.params.id));
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
      .reduce((sum, inv) => sum + (parseFloat(String(inv.total || "0")) || 0), 0);

    const totalExpenses = allExpenses
      .reduce((sum, exp) => sum + (parseFloat(String(exp.amount || "0")) || 0), 0);

    res.json({
      income: totalIncome,
      expenses: totalExpenses,
      netProfit: totalIncome - totalExpenses,
    });
  });

  // All data routes below require authentication
  app.use("/api/owners", requireAuth);
  app.use("/api/pets", requireAuth);
  app.use("/api/appointments", requireAuth);
  app.use("/api/medical-records", requireAuth, requirePermission("medical_records.view", "medical_records.manage", "medical_records.create", "medical_records.delete"));

  // â”€â”€ Dashboard Summary (lightweight single-query endpoint) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Returns only counts + today's appointments + recent pets
  // so the dashboard never needs to fetch ALL pets/owners/appointments.
  app.get("/api/dashboard/summary", requireAuth, async (req, res) => {
    try {
      // Use IST (UTC+5:30) when computing "today" on the server â€” the client passes
      // its local date as a query param, but if absent we compute IST explicitly so
      // the 00:00-05:30 IST window never counts as "yesterday".
      const today = typeof req.query.date === "string"
        ? req.query.date
        : new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];


      // Run all queries concurrently (fast)
      const [
        allAppointments,
        recentPetsRaw,
        totalPets,
        totalOwners,
        todayAllRaw,
        todayPendingRaw,
        todayCompletedRaw,
        todayCancelledRaw,
        totalAppointmentsRaw,
      ] = await Promise.all([
        // Today & future scheduled/in-progress (for the appointment list)
        db.select().from(appointments).where(
          and(gte(appointments.date, today), inArray(appointments.status, ["scheduled", "in-progress"]))
        ),
        // Only the last 5 pets
        db.select().from(pets).orderBy(desc(pets.id)).limit(5),
        // Just the count
        db.select({ count: sqlTag<number>`count(*)::int` }).from(pets),
        db.select({ count: sqlTag<number>`count(*)::int` }).from(owners),
        // ALL today's appointments regardless of status (for the "Today's Appointments" card)
        db.select({ count: sqlTag<number>`count(*)::int` }).from(appointments)
          .where(eq(appointments.date, today)),
        // PENDING today = scheduled + in-progress only (decreases as consultations complete)
        db.select({ count: sqlTag<number>`count(*)::int` }).from(appointments)
          .where(and(eq(appointments.date, today), inArray(appointments.status, ["scheduled", "in-progress"]))),
        // Completed today
        db.select({ count: sqlTag<number>`count(*)::int` }).from(appointments)
          .where(and(eq(appointments.date, today), eq(appointments.status, "completed"))),
        // Cancelled today
        db.select({ count: sqlTag<number>`count(*)::int` }).from(appointments)
          .where(and(eq(appointments.date, today), eq(appointments.status, "cancelled"))),
        // All-time total
        db.select({ count: sqlTag<number>`count(*)::int` }).from(appointments),
      ]);

      const todayCompleted = todayCompletedRaw;
      const todayCancelled = todayCancelledRaw;
      const totalAppointments = totalAppointmentsRaw;

      // Fetch owner info for recent pets
      const ownerIds = [...new Set(recentPetsRaw.map(p => p.ownerId))];
      const recentOwners = ownerIds.length > 0
        ? await db.select().from(owners).where(inArray(owners.id, ownerIds))
        : [];

      // Fetch owner info for today's appointments
      const aptOwnerIds = [...new Set(allAppointments.map(a => a.ownerId))];
      const aptPetIds = [...new Set(allAppointments.map(a => a.petId))];
      const [aptOwners, aptPets] = await Promise.all([
        aptOwnerIds.length > 0
          ? db.select().from(owners).where(inArray(owners.id, aptOwnerIds))
          : [],
        aptPetIds.length > 0
          ? db.select().from(pets).where(inArray(pets.id, aptPetIds))
          : [],
      ]);

      res.json({
        counts: {
          totalPets: totalPets[0]?.count ?? 0,
          totalOwners: totalOwners[0]?.count ?? 0,
          totalAppointments: totalAppointments[0]?.count ?? 0,
          // todayScheduled = ALL today's appointments (fixed total, never decreases)
          todayScheduled: todayAllRaw[0]?.count ?? 0,
          // todayPending = only scheduled/in-progress (decreases as consultations complete)
          todayPending: todayPendingRaw[0]?.count ?? 0,
          todayCompleted: todayCompleted[0]?.count ?? 0,
          todayCancelled: todayCancelled[0]?.count ?? 0,
        },
        upcomingAppointments: allAppointments.slice(0, 20),
        recentPets: recentPetsRaw,
        recentOwners,
        appointmentPets: aptPets,
        appointmentOwners: aptOwners,
      });
    } catch (err: any) {
      console.error("[Dashboard Summary] Error:", err);
      res.status(500).json({ message: err.message || "Failed to load dashboard summary" });
    }
  });

  // Owners
  app.get("/api/owners", async (_req, res) => {
    const cached = getCachedData<any[]>("owners");
    if (cached) return res.json(cached);
    const allOwners = await storage.getOwners();
    setCachedData("owners", allOwners);
    res.json(allOwners);
  });

  // Server-side owner search — joins owners with pets so pet-name search always works
  // GET /api/owners/search?q=rocky  =>  owners whose name/phone matches OR any pet name matches
  app.get("/api/owners/search", async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (!q || q.length < 1) return res.json([]);
    try {
      const pattern = `%${q.toLowerCase()}%`;
      const rows = await db.execute(sqlTag`
        WITH matching_owners AS (
          SELECT DISTINCT o.id, o.first_name, o.last_name, o.email, o.phone, o.address
          FROM owners o
          LEFT JOIN pets p ON p.owner_id = o.id
          WHERE
            LOWER(o.first_name) LIKE ${pattern} OR
            LOWER(COALESCE(o.last_name, '')) LIKE ${pattern} OR
            LOWER(o.phone) LIKE ${pattern} OR
            LOWER(COALESCE(p.name, '')) LIKE ${pattern}
        ),
        owner_activity AS (
          SELECT 
            mo.*,
            COALESCE(MAX(a.id), 0) as max_apt_id,
            COALESCE(MAX(inv.id), 0) as max_inv_id
          FROM matching_owners mo
          LEFT JOIN appointments a ON a.owner_id = mo.id
          LEFT JOIN invoices inv ON inv.owner_id = mo.id
          GROUP BY mo.id, mo.first_name, mo.last_name, mo.email, mo.phone, mo.address
        )
        SELECT id, first_name, last_name, email, phone, address
        FROM owner_activity
        ORDER BY GREATEST(max_apt_id, max_inv_id) DESC, id DESC
        LIMIT 50
      `);

      const results = (rows.rows as any[]).map(r => ({
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name || "",
        email: r.email,
        phone: r.phone,
        address: r.address,
      }));

      res.json(results);
    } catch (err: any) {
      console.error("[Owner Search] Error:", err.message);
      res.status(500).json({ message: "Search failed" });
    }
  });


  app.get("/api/owners/:id", async (req, res) => {
    const owner = await storage.getOwner(parseInt(String(req.params.id)));
    if (!owner) return res.status(404).json({ message: "Owner not found" });
    res.json(owner);
  });

  app.post("/api/owners", async (req, res) => {
    const parsed = insertOwnerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    // Check if phone number already exists
    const existingOwner = await storage.getOwnerByPhone(parsed.data.phone);
    if (existingOwner) {
      return res.status(409).json({ message: "Owner with this phone number already exists." });
    }

    const owner = await storage.createOwner(parsed.data);
    invalidateDataCache("owners");
    logActivity(req, "CREATE", "Owner", owner.id, `Created owner "${owner.firstName} ${owner.lastName || ""}"`);
    res.status(201).json(owner);
  });

  app.patch("/api/owners/:id", async (req, res) => {
    const parsed = insertOwnerSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const ownerId = parseInt(String(req.params.id));

    if (parsed.data.phone) {
      const existingOwner = await storage.getOwnerByPhone(parsed.data.phone);
      if (existingOwner && existingOwner.id !== ownerId) {
        return res.status(409).json({ message: "Owner with this phone number already exists." });
      }
    }

    const updated = await storage.updateOwner(ownerId, parsed.data);
    if (!updated) return res.status(404).json({ message: "Owner not found" });
    invalidateDataCache("owners");
    logActivity(req, "UPDATE", "Owner", updated.id, `Updated owner "${updated.firstName}"`);
    res.json(updated);
  });

  app.delete("/api/owners/:id", async (req, res) => {
    logActivity(req, "DELETE", "Owner", parseInt(String(req.params.id)), "Deleted owner");
    await storage.deleteOwner(parseInt(String(req.params.id)));
    invalidateDataCache("owners");
    res.status(204).send();
  });

  // Pets
  app.get("/api/pets", async (_req, res) => {
    const cached = getCachedData<any[]>("pets");
    if (cached) return res.json(cached);
    const allPets = await storage.getPets();
    setCachedData("pets", allPets);
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

    // Preserve ageMonths explicitly
    const petData: any = { ...parsed.data };
    if (req.body.ageMonths !== undefined) {
      petData.ageMonths = parseInt(String(req.body.ageMonths)) || 0;
    }

    const pet = await storage.createPet(petData);
    invalidateDataCache("pets");
    logActivity(req, "CREATE", "Pet", pet.id, `Created pet "${pet.name}"`);
    res.status(201).json(pet);
  });

  app.patch("/api/pets/:id", async (req, res) => {
    const parsed = insertPetSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    // Explicitly include ageMonths if provided in body (Zod may strip default-valued fields)
    const updateData: any = { ...parsed.data };
    if (req.body.ageMonths !== undefined) {
      updateData.ageMonths = parseInt(String(req.body.ageMonths)) || 0;
    }

    const updated = await storage.updatePet(parseInt(String(req.params.id)), updateData);
    if (!updated) return res.status(404).json({ message: "Pet not found" });
    invalidateDataCache("pets");
    logActivity(req, "UPDATE", "Pet", updated.id, `Updated pet "${updated.name}"`);
    res.json(updated);
  });

  app.delete("/api/pets/:id", async (req, res) => {
    logActivity(req, "DELETE", "Pet", parseInt(String(req.params.id)), "Deleted pet");
    await storage.deletePet(parseInt(String(req.params.id)));
    invalidateDataCache("pets");
    res.status(204).send();
  });

  // Appointments
  app.get("/api/appointments", async (_req, res) => {
    const cached = getCachedData<any[]>("appointments");
    if (cached) return res.json(cached);
    const allAppointments = await storage.getAppointments();
    setCachedData("appointments", allAppointments);
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
    invalidateDataCache("appointments");
    logActivity(req, "CREATE", "Appointment", appointment.id, `Created appointment for pet #${appointment.petId}`);
    res.status(201).json(appointment);
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    const parsed = insertAppointmentSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateAppointment(parseInt(String(req.params.id)), parsed.data);
    if (!updated) return res.status(404).json({ message: "Appointment not found" });
    invalidateDataCache("appointments");
    logActivity(req, "UPDATE", "Appointment", updated.id, `Updated appointment`);
    res.json(updated);
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    logActivity(req, "DELETE", "Appointment", parseInt(String(req.params.id)), "Deleted appointment");
    await storage.deleteAppointment(parseInt(String(req.params.id)));
    invalidateDataCache("appointments");
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

  // Clear activity logs â€“ superadmin only
  app.delete("/api/activity-logs", requireAuth, async (req, res) => {
    const currentUserId = (req.session as any)?.userId;
    const currentUser = currentUserId ? await storage.getUser(currentUserId) : null;
    if (!currentUser || currentUser.role.toLowerCase() !== "superadmin") {
      return res.status(403).json({ message: "Only Super Admin can clear activity logs" });
    }
    const beforeDate = req.query.beforeDate ? String(req.query.beforeDate) : undefined;
    const count = await storage.deleteActivityLogs(beforeDate);
    const detail = beforeDate
      ? `Cleared ${count} activity log entries before ${beforeDate}`
      : `Cleared all ${count} activity log entries`;
    await logActivity(req, "ERASE", "Activity Log", undefined, detail);
    res.json({ message: detail, count });
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

  // Blood Smear Pathogens
  app.get("/api/blood-smear-pathogens", requireAuth, async (req, res) => {
    try {
      const species = req.query.species ? String(req.query.species) : undefined;
      const list = await storage.getBloodSmearPathogens(species);
      res.json(list);
    } catch (error) {
      console.error("[Routes] Error fetching blood smear pathogens:", error);
      res.status(500).json({ message: "Failed to fetch blood smear pathogens" });
    }
  });

  app.post("/api/blood-smear-pathogens", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const parsed = insertBloodSmearPathogenSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createBloodSmearPathogen(parsed.data);
    logActivity(req, "CREATE", "Blood Smear Pathogen", created.id, `Created pathogen "${created.name}" for ${created.species}`);
    res.status(201).json(created);
  });

  app.patch("/api/blood-smear-pathogens/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    const parsed = insertBloodSmearPathogenSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateBloodSmearPathogen(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Pathogen not found" });
    logActivity(req, "UPDATE", "Blood Smear Pathogen", id, `Updated blood smear pathogen`);
    res.json(updated);
  });

  app.delete("/api/blood-smear-pathogens/:id", requireAuth, requirePermission("admin_dashboard.view"), async (req, res) => {
    const id = parseInt(String(req.params.id));
    await storage.deleteBloodSmearPathogen(id);
    logActivity(req, "DELETE", "Blood Smear Pathogen", id, "Deleted blood smear pathogen");
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

  // Auto-start the HL7 listener on server boot (only in standalone/VPS, not in serverless)
  if (!process.env.VERCEL) {
    try {
      startHL7Listener(5100);
      console.log('[Routes] Mindray HL7 listener auto-started on port 5100');
    } catch (err) {
      console.error('[Routes] Failed to auto-start HL7 listener:', err);
    }
  }

  return httpServer;
}

