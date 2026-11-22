import { db } from "./db";
import { users, platformAdmins, roles, feeStructures, labTestCategories, labTests, labRefRanges, species, bloodSmearPathogens, taxCategories } from "../shared/schema";
import { defaultPathogens } from "../shared/seed_pathogens";
import { eq, and, not, inArray, sql } from "drizzle-orm";
import { log } from "./logger";
import { hashPassword } from "./auth";

export async function seedDatabase(options: { seedUsers?: boolean } = {}) {
  const existingRoles = await db.select().from(roles);
  if (existingRoles.length === 0) {
    log("Creating default roles...", "seed");
    await db.insert(roles).values({
      name: "superadmin",
      description: "Full system access with all permissions",
      permissions: [
        "dashboard.view", "patients.view", "patients.create", "patients.edit", "patients.delete",
        "owners.view", "owners.create", "owners.edit", "owners.delete",
        "appointments.view", "appointments.create", "appointments.edit", "appointments.delete",
        "medical_records.view", "medical_records.create", "medical_records.delete",
        "billing.view", "billing.create", "billing.edit", "billing.delete",
        "fee_structure.view", "fee_structure.manage",
        "user_management.view", "user_management.manage",
        "roles.manage", "backup.export", "admin_dashboard.view", "data.erase",
        "inventory.view", "inventory.manage",
        "purchase.view", "purchase.create", "purchase.edit", "purchase.delete", "purchase.manage",
        "accounts.view", "accounts.manage",
        "reports.view", "activity_log.view",
      ],
      isSystem: "true",
    });
    await db.insert(roles).values({
      name: "admin",
      description: "Administrator access with most permissions except data erasure",
      permissions: [
        "dashboard.view", "patients.view", "patients.create", "patients.edit", "patients.delete",
        "owners.view", "owners.create", "owners.edit", "owners.delete",
        "appointments.view", "appointments.create", "appointments.edit", "appointments.delete",
        "medical_records.view", "medical_records.create", "medical_records.delete",
        "billing.view", "billing.create", "billing.edit", "billing.delete",
        "fee_structure.view", "fee_structure.manage",
        "user_management.view", "user_management.manage",
        "roles.manage", "backup.export", "admin_dashboard.view",
        "inventory.view", "inventory.manage",
        "purchase.view", "purchase.create", "purchase.edit", "purchase.delete", "purchase.manage",
        "accounts.view", "accounts.manage",
        "reports.view", "activity_log.view",
      ],
      isSystem: "true",
    });
  } else {
    // Ensure superadmin has all permissions even if checks pass
    await db.update(roles)
      .set({
        permissions: [
          "dashboard.view", "patients.view", "patients.create", "patients.edit", "patients.delete",
          "owners.view", "owners.create", "owners.edit", "owners.delete",
          "appointments.view", "appointments.create", "appointments.edit", "appointments.delete",
          "medical_records.view", "medical_records.create", "medical_records.delete",
          "billing.view", "billing.create", "billing.edit", "billing.delete",
          "fee_structure.view", "fee_structure.manage",
          "user_management.view", "user_management.manage",
          "roles.manage", "backup.export", "admin_dashboard.view", "data.erase",
          "inventory.view", "inventory.manage",
          "purchase.view", "purchase.create", "purchase.edit", "purchase.delete", "purchase.manage",
          "accounts.view", "accounts.manage",
          "reports.view", "activity_log.view",
        ]
      })
      .where(eq(roles.name, "superadmin"));

    // Ensure receptionist role gets updated exactly once with new rights (if it was formerly a system role)
    // By setting isSystem to false, this block will not mercilessly overwrite user manual edits on later restarts.
    await db.update(roles)
      .set({
        isSystem: "false",
        permissions: [
          "dashboard.view", "patients.view", "patients.create", "patients.edit", "patients.delete",
          "owners.view", "owners.create", "owners.edit", "owners.delete",
          "appointments.view", "appointments.create", "appointments.edit", "appointments.delete",
          "medical_records.view", "medical_records.create", "medical_records.delete",
          "activity_log.view", "billing.view", "billing.create", "billing.edit", "billing.delete",
          "fee_structure.view", "fee_structure.manage", "inventory.view", "inventory.manage",
          "reports.view", "accounts.view", "accounts.manage",
          "user_management.view", "user_management.manage",
          "roles.manage", "backup.export", "admin_dashboard.view"
        ]
      })
      .where(and(eq(roles.name, "receptionist"), eq(roles.isSystem, "true")));

    // Ensure all other legacy roles (doctor, pharmacy, etc) are no longer system roles
    // and can be created or managed manually. Admin and Superadmin remain as system roles.
    await db.update(roles)
      .set({ isSystem: "false" })
      .where(and(not(inArray(roles.name, ["admin", "superadmin"])), eq(roles.isSystem, "true")));

    // Always update admin role permissions to the latest set (just like superadmin)
    const adminRoleExists = await db.select().from(roles).where(eq(roles.name, "admin"));
    if (adminRoleExists.length === 0) {
      log("Backfilling admin role...", "seed");
      await db.insert(roles).values({
        name: "admin",
        description: "Administrator access with most permissions except data erasure",
        permissions: [
          "dashboard.view", "patients.view", "patients.create", "patients.edit", "patients.delete",
          "owners.view", "owners.create", "owners.edit", "owners.delete",
          "appointments.view", "appointments.create", "appointments.edit", "appointments.delete",
          "medical_records.view", "medical_records.create", "medical_records.delete",
          "billing.view", "billing.create", "billing.edit", "billing.delete",
          "fee_structure.view", "fee_structure.manage",
          "user_management.view", "user_management.manage",
          "roles.manage", "backup.export", "admin_dashboard.view",
          "inventory.view", "inventory.manage",
          "purchase.view", "purchase.create", "purchase.edit", "purchase.delete", "purchase.manage",
          "accounts.view", "accounts.manage",
          "reports.view", "activity_log.view",
        ],
        isSystem: "true",
      });
    } else {
      // Update admin permissions to include all new features added over time
      log("Updating admin role permissions to latest...", "seed");
      await db.update(roles)
        .set({
          permissions: [
            "dashboard.view", "patients.view", "patients.create", "patients.edit", "patients.delete",
            "owners.view", "owners.create", "owners.edit", "owners.delete",
            "appointments.view", "appointments.create", "appointments.edit", "appointments.delete",
            "medical_records.view", "medical_records.create", "medical_records.delete",
            "billing.view", "billing.create", "billing.edit", "billing.delete",
            "fee_structure.view", "fee_structure.manage",
            "user_management.view", "user_management.manage",
            "roles.manage", "backup.export", "admin_dashboard.view",
            "inventory.view", "inventory.manage",
            "purchase.view", "purchase.create", "purchase.edit", "purchase.delete", "purchase.manage",
            "accounts.view", "accounts.manage",
            "reports.view", "activity_log.view",
          ]
        })
        .where(eq(roles.name, "admin"));
    }

    // ── FIX: Ensure EVERY role in the DB has permissions ──────────────────────
    // Any role with empty/null permissions will be given sensible defaults.
    // This prevents users from seeing a blank sidebar.
    const allRoles = await db.select().from(roles);

    // Default permissions for common role names
    const roleDefaults: Record<string, string[]> = {
      doctor: [
        "dashboard.view",
        "patients.view", "patients.create", "patients.edit",
        "owners.view",
        "appointments.view", "appointments.create", "appointments.edit",
        "medical_records.view", "medical_records.create",
        "billing.view", "billing.create",
        "fee_structure.view",
        "inventory.view",
        "accounts.view",
        "reports.view",
      ],
      receptionist: [
        "dashboard.view",
        "patients.view", "patients.create", "patients.edit",
        "owners.view", "owners.create", "owners.edit",
        "appointments.view", "appointments.create", "appointments.edit",
        "medical_records.view",
        "billing.view", "billing.create",
        "fee_structure.view",
        "inventory.view", "inventory.manage",
        "accounts.view", "accounts.manage",
        "reports.view",
      ],
      nurse: [
        "dashboard.view",
        "patients.view", "patients.create", "patients.edit",
        "owners.view",
        "appointments.view", "appointments.create",
        "medical_records.view", "medical_records.create",
        "billing.view",
        "inventory.view",
      ],
      pharmacist: [
        "dashboard.view",
        "patients.view",
        "billing.view", "billing.create",
        "fee_structure.view",
        "inventory.view", "inventory.manage",
        "accounts.view",
        "reports.view",
      ],
      lab: [
        "dashboard.view",
        "patients.view",
        "medical_records.view", "medical_records.create",
        "billing.view",
        "inventory.view",
      ],
      // Minimal fallback for any unrecognised role
      _default: [
        "dashboard.view",
        "patients.view",
        "owners.view",
        "appointments.view",
        "medical_records.view",
        "billing.view",
      ],
    };

    for (const role of allRoles) {
      const isEmpty = !role.permissions || !Array.isArray(role.permissions) || role.permissions.length === 0;
      if (isEmpty) {
        const nameLower = role.name.toLowerCase();
        // Try exact match, then partial match, then default
        let perms: string[] = roleDefaults._default;
        for (const [key, p] of Object.entries(roleDefaults)) {
          if (key === "_default") continue;
          if (nameLower === key || nameLower.includes(key)) {
            perms = p;
            break;
          }
        }
        log(`Role "${role.name}" has no permissions – assigning defaults...`, "seed");
        await db.update(roles).set({ permissions: perms }).where(eq(roles.id, role.id));
      }
    }
    // ──────────────────────────────────────────────────────────────────────────
  }

  const existingFees = await db.select().from(feeStructures);
  if (existingFees.length === 0) {
    log("Creating sample fee structures...", "seed");
    await db.insert(feeStructures).values([
      { name: "General Consultation", category: "Consultation", amount: "500.00", description: "Standard veterinary consultation" },
      { name: "Follow-up Visit", category: "Consultation", amount: "300.00", description: "Follow-up appointment after treatment" },
      { name: "Emergency Consultation", category: "Consultation", amount: "1000.00", description: "After-hours emergency visit" },
      { name: "Rabies Vaccination", category: "Vaccination", amount: "350.00", description: "Annual rabies vaccine" },
      { name: "DHPP Vaccination", category: "Vaccination", amount: "600.00", description: "Distemper, Hepatitis, Parvo, Parainfluenza combo" },
      { name: "Deworming", category: "Treatment", amount: "200.00", description: "Standard deworming treatment" },
      { name: "Dental Cleaning", category: "Dental", amount: "2500.00", description: "Professional dental cleaning under sedation" },
      { name: "X-Ray", category: "Diagnostics", amount: "1200.00", description: "Single X-ray image" },
      { name: "Blood Test - Complete", category: "Diagnostics", amount: "800.00", description: "Complete blood count and chemistry panel" },
      { name: "Spay/Neuter - Small", category: "Surgery", amount: "3500.00", description: "Spay or neuter for small breed" },
      { name: "Spay/Neuter - Large", category: "Surgery", amount: "5000.00", description: "Spay or neuter for large breed" },
      { name: "Grooming - Basic", category: "Grooming", amount: "800.00", description: "Bath, brush, nail trim" },
      { name: "Grooming - Full", category: "Grooming", amount: "1500.00", description: "Full grooming with haircut and styling" },
    ]);
  }

  const existingTax = await db.select().from(taxCategories).where(eq(taxCategories.name, "NA"));
  if (existingTax.length === 0) {
    log("Creating default 'NA' tax category...", "seed");
    await db.insert(taxCategories).values({
      name: "NA",
      purchaseSgst: "0",
      salesSgst: "0",
      purchaseCgst: "0",
      salesCgst: "0",
      purchaseIgst: "0",
      salesIgst: "0",
    });
  }

  const { LAB_REPORT_CATEGORIES } = await import("../shared/schema");

  // Seed default species
  const defaultSpecies = ["Canine", "Feline", "Bovine", "Equine", "Avian"];
  for (const sp of defaultSpecies) {
    const existing = await db.select().from(species).where(eq(species.name, sp));
    if (existing.length === 0) {
      log(`Creating default species: ${sp}`, "seed");
      await db.insert(species).values({ name: sp });
    }
  }

  // Migration: Merge duplicates if they exist
  // Map old names to new standard names
  const categoryMap: Record<string, string> = {
    "CBC PANEL": "Hematology",
    "BIOCHEMISTRY PANEL": "Biochemistry",
    "FAECAL PANEL": "Faecal Sample",
    "URINALYSIS PANEL": "Urinalysis"
  };

  for (const [oldName, newName] of Object.entries(categoryMap)) {
    const oldCat = await db.select().from(labTestCategories).where(eq(labTestCategories.name, oldName));
    const newCat = await db.select().from(labTestCategories).where(eq(labTestCategories.name, newName));

    if (oldCat.length > 0) {
      log(`Migrating ${oldName} to ${newName}...`, "seed");

      let targetId: number;

      if (newCat.length === 0) {
        // Create new category if it doesn't exist
        const [created] = await db.insert(labTestCategories).values({ name: newName }).returning();
        targetId = created.id;
      } else {
        targetId = newCat[0].id;
      }

      // Move tests from old category to new category
      await db.update(labTests)
        .set({ categoryId: targetId })
        .where(eq(labTests.categoryId, oldCat[0].id));

      // Delete old category
      await db.delete(labTestCategories).where(eq(labTestCategories.id, oldCat[0].id));
      log(`Merged ${oldName} into ${newName}`, "seed");
    }
  }

  // --- Migration: Remove old exact-match duplicate test names ---
  log("Checking for duplicate legacy lab tests (Hemoglobin, PCV, Platelets)...", "seed");
  const oldTestNames = ["Hemoglobin", "PCV", "Platelets"];
  const legacyTests = await db.select().from(labTests).where(inArray(labTests.name, oldTestNames));
  if (legacyTests.length > 0) {
    log(`Found ${legacyTests.length} legacy tests to clean up to prevent duplicates.`, "seed");
    const legacyIds = legacyTests.map(t => t.id);
    await db.delete(labRefRanges).where(inArray(labRefRanges.testId, legacyIds));
    await db.delete(labTests).where(inArray(labTests.id, legacyIds));
  }
  // --------------------------------------------------------------

  // Ensure all standard categories exist and populate Hematology defaults
  for (const cat of LAB_REPORT_CATEGORIES) {
    const existing = await db.select().from(labTestCategories).where(eq(labTestCategories.name, cat));
    let catId: number;

    if (existing.length === 0) {
      log(`Creating missing lab category: ${cat}`, "seed");
      const [created] = await db.insert(labTestCategories).values({ name: cat }).returning();
      catId = created.id;
    } else {
      catId = existing[0].id;
    }

    // Seed Hematology Tests if they don't exist
    if (cat === "Hematology") {
      const hematologyTests = [
        { name: "RBC", unit: "million/µL", sortOrder: 1, min: "5.5", max: "8.5" },
        { name: "Hemoglobin (Hb)", unit: "g/dL", sortOrder: 2, min: "12", max: "18" },
        { name: "PCV (HCT)", unit: "%", sortOrder: 3, min: "37", max: "55" },
        { name: "WBC", unit: "/µL", sortOrder: 4, min: "6000", max: "17000" },
        { name: "Platelet Count", unit: "x10^3/µL", sortOrder: 5, min: "200", max: "500" },
        { name: "MCV", unit: "fL", sortOrder: 6, min: "60", max: "77" },
        { name: "MCH", unit: "pg", sortOrder: 7, min: "19", max: "23" },
        { name: "MCHC", unit: "g/dL", sortOrder: 8, min: "32", max: "36" },
        { name: "Neutrophils", unit: "%", sortOrder: 9, min: "60", max: "77" },
        { name: "Lymphocytes", unit: "%", sortOrder: 10, min: "12", max: "30" },
        { name: "Monocytes", unit: "%", sortOrder: 11, min: "3", max: "10" },
        { name: "Eosinophils", unit: "%", sortOrder: 12, min: "2", max: "10" },
        { name: "Basophils", unit: "%", sortOrder: 13, min: "0", max: "1" },
      ];

      for (const t of hematologyTests) {
        const existingTest = await db.select().from(labTests).where(and(eq(labTests.categoryId, catId), eq(labTests.name, t.name)));
        if (existingTest.length === 0) {
          log(`Creating default Hematology test: ${t.name}`, "seed");
          const [newTest] = await db.insert(labTests).values({
            categoryId: catId,
            name: t.name,
            unit: t.unit,
            sortOrder: t.sortOrder,
            section: "General"
          }).returning();

          // Add default reference range for Canine
          await db.insert(labRefRanges).values({
            testId: newTest.id,
            species: "Canine",
            min: t.min,
            max: t.max
          });
        }
      }
    }

    // Seed Biochemistry Tests if they don't exist
    if (cat === "Biochemistry") {
      const biochemistryTests = [
        { name: "Glucose", unit: "mg/dL", sortOrder: 1, min: "70", max: "120" },
        { name: "Urea (BUN)", unit: "mg/dL", sortOrder: 2, min: "7", max: "27" },
        { name: "Creatinine", unit: "mg/dL", sortOrder: 3, min: "0.5", max: "1.5" },
        { name: "ALT (SGPT)", unit: "U/L", sortOrder: 4, min: "10", max: "125" },
        { name: "AST (SGOT)", unit: "U/L", sortOrder: 5, min: "15", max: "66" },
        { name: "ALP", unit: "U/L", sortOrder: 6, min: "20", max: "150" },
        { name: "Total Protein", unit: "g/dL", sortOrder: 7, min: "5.5", max: "7.5" },
        { name: "Albumin", unit: "g/dL", sortOrder: 8, min: "2.7", max: "4.4" },
        { name: "Globulin", unit: "g/dL", sortOrder: 9, min: "2.5", max: "4.5" },
        { name: "Total Bilirubin", unit: "mg/dL", sortOrder: 10, min: "0.1", max: "0.6" },
        { name: "Sodium", unit: "mmol/L", sortOrder: 11, min: "140", max: "155" },
        { name: "Potassium", unit: "mmol/L", sortOrder: 12, min: "3.5", max: "5.8" },
        { name: "Chloride", unit: "mmol/L", sortOrder: 13, min: "105", max: "115" },
        { name: "Calcium", unit: "mg/dL", sortOrder: 14, min: "9", max: "11.5" },
        { name: "Phosphorus", unit: "mg/dL", sortOrder: 15, min: "2.5", max: "6.0" },
      ];

      for (const t of biochemistryTests) {
        const existingTest = await db.select().from(labTests).where(and(eq(labTests.categoryId, catId), eq(labTests.name, t.name)));
        if (existingTest.length === 0) {
          log(`Creating default Biochemistry test: ${t.name}`, "seed");
          const [newTest] = await db.insert(labTests).values({
            categoryId: catId,
            name: t.name,
            unit: t.unit,
            sortOrder: t.sortOrder,
            section: "General"
          }).returning();

          // Add default reference range for Canine
          await db.insert(labRefRanges).values({
            testId: newTest.id,
            species: "Canine",
            min: t.min,
            max: t.max
          });
        }
      }
    }
  }

  // ── PLATFORM ADMIN AND CLINIC ADMIN ───────────────────────────
  if (options.seedUsers !== false) {
  const adminExists = await db.select().from(users).where(eq(users.email, "admin@petpointvet.in"));
  if (adminExists.length === 0) {
    log("Creating admin user...", "seed");
    const hashedAdminPw = await hashPassword("admin123");
    await db.insert(users).values({
      name: "Admin",
      email: "admin@petpointvet.in",
      password: hashedAdminPw,
      role: "admin",
      phone: "",
    });
  } else {
    // Only fix the role — do NOT re-hash the password on every restart
    log("Admin exists, ensuring role is correct...", "seed");
    await db.update(users)
      .set({ role: "admin" })
      .where(eq(users.email, "admin@petpointvet.in"));
  }
  }

  // ── IMPORT COMPREHENSIVE LAB REFERENCE RANGES ────────────────────
  // PERF: Skip the expensive upsert loop if ref ranges are already seeded.
  // On an established DB this cuts ~200+ DB round trips down to 1 count query.
  const existingRefRanges = await db.select({ count: sql`count(*)` }).from(labRefRanges);
  const refRangeCount = Number((existingRefRanges[0] as any)?.count || 0);

  if (refRangeCount < 50) {
  log("Importing standard reference ranges for all species...", "seed");
  const HAEMATOLOGY = [
    { name: "Hemoglobin (Hb)", unit: "% (g/dL)", ranges: { "Canine": ["14", "20"], "Feline": ["11", "16"], "Bovine": ["8", "12"], "Caprine": ["8", "12"], "Equine": ["11", "16"], "Porcine": ["10", "14"], "Elephant": ["9.6", "15.3"], "Lagomorph": ["10.5", "15.8"] } },
    { name: "PCV (HCT)", unit: "%", ranges: { "Canine": ["40", "56"], "Feline": ["34", "51"], "Bovine": ["22", "32"], "Caprine": ["22", "38"], "Equine": ["30", "44"], "Porcine": ["34", "44"], "Elephant": ["27", "44"], "Lagomorph": ["32", "47"] } },
    { name: "RBC", unit: "x10^6/µL", ranges: { "Canine": ["5.7", "8.3"], "Feline": ["7.4", "10.4"], "Bovine": ["5.1", "7.6"], "Caprine": ["8", "18"], "Equine": ["6.6", "11"], "Porcine": ["6.4", "8.4"], "Elephant": ["2.1", "3.6"], "Lagomorph": ["4.9", "7.5"] } },
    { name: "MCV", unit: "fL", ranges: { "Canine": ["64", "74"], "Feline": ["42", "52"], "Bovine": ["38", "50"], "Caprine": ["16", "25"], "Equine": ["38", "51"], "Porcine": ["49", "59"], "Elephant": ["111", "138"], "Lagomorph": ["52", "72"] } },
    { name: "MCH", unit: "pg", ranges: { "Canine": ["22", "26"], "Feline": ["13", "17"], "Bovine": ["14", "18"], "Caprine": ["5.2", "8.0"], "Equine": ["13", "19"], "Porcine": ["17", "21"], "Elephant": ["42", "57"], "Lagomorph": ["19", "24"] } },
    { name: "MCHC", unit: "% (g/dL)", ranges: { "Canine": ["33", "38"], "Feline": ["30", "33"], "Bovine": ["36", "39"], "Caprine": ["30", "36"], "Equine": ["35", "39"], "Porcine": ["29", "33"], "Elephant": ["33.4", "35.7"], "Lagomorph": ["30.5", "36.3"] } },
    { name: "WBC", unit: "x10^3/µL", ranges: { "Canine": ["5.0", "13"], "Feline": ["5.4", "15.4"], "Bovine": ["4.9", "12"], "Caprine": ["4", "13"], "Equine": ["5.6", "11.6"], "Porcine": ["15.6", "38.9"], "Elephant": ["8.6", "18.2"], "Lagomorph": ["3.4", "12.3"] } },
    { name: "Neutrophils", unit: "%", ranges: { "Canine": "68%", "Feline": "63%", "Bovine": "52%", "Caprine": "55%", "Equine": "58%", "Porcine": "42%", "Elephant": "23%", "Lagomorph": "65%" } },
    { name: "Lymphocytes", unit: "%", ranges: { "Canine": "26%", "Feline": "36%", "Bovine": "47%", "Caprine": "69%", "Equine": "49%", "Porcine": "52%", "Elephant": "27%", "Lagomorph": "34%" } },
    { name: "Monocytes", unit: "%", ranges: { "Canine": "6%", "Feline": "6%", "Bovine": "7%", "Caprine": "4%", "Equine": "6%", "Porcine": "9%", "Elephant": "50%", "Lagomorph": "1%" } },
    { name: "Platelet Count", unit: "x10^3/µL", ranges: { "Canine": ["134", "396"], "Feline": ["160", "500"], "Bovine": ["190", "640"], "Caprine": ["300", "600"], "Equine": ["100", "308"], "Porcine": ["211", "887"], "Elephant": ["340", "720"], "Lagomorph": ["200", "1060"] } }
  ];

  const BIOCHEMISTRY = [
    { name: "AST (SGOT)", unit: "U/L", ranges: { "Canine": ["23", "66"], "Feline": ["26", "43"], "Bovine": ["78", "132"], "Caprine": ["167", "513"], "Equine": ["226", "366"], "Porcine": ["32", "84"], "Elephant": ["15", "35"], "Lagomorph": ["0", "47"] } },
    { name: "ALT (SGPT)", unit: "U/L", ranges: { "Canine": ["21", "102"], "Feline": ["6", "83"], "Bovine": ["11", "40"], "Caprine": ["6", "19"], "Equine": ["3", "23"], "Porcine": ["31", "58"], "Elephant": ["1.5", "3"], "Lagomorph": ["0", "79"] } },
    { name: "ALP", unit: "U/L", ranges: { "Canine": ["20", "156"], "Feline": ["25", "93"], "Bovine": ["0", "488"], "Caprine": ["93", "387"], "Equine": ["143", "395"], "Porcine": ["118", "395"], "Elephant": ["60", "450"], "Lagomorph": ["0", "120"] } },
    { name: "GGT", unit: "U/L", ranges: { "Canine": ["1.2", "6.4"], "Feline": ["1.3", "5.1"], "Bovine": ["6.1", "17.4"], "Caprine": ["20", "56"], "Equine": ["4.3", "13.4"], "Porcine": ["1.2", "6.4"], "Elephant": ["4", "35"] } },
    { name: "Total Bilirubin", unit: "mg/dL", ranges: { "Canine": ["0.10", "0.50"], "Feline": ["0.15", "0.50"], "Bovine": ["0.01", "0.5"], "Caprine": ["0", "0.1"], "Equine": ["1", "2"], "Porcine": ["0.10", "0.50"], "Elephant": ["0.2", "1"], "Lagomorph": ["0", "0.9"] } },
    { name: "Total Protein", unit: "g/dL", ranges: { "Canine": ["5.4", "7.1"], "Feline": ["5.4", "7.8"], "Bovine": ["6.7", "7.5"], "Caprine": ["6.4", "7.0"], "Equine": ["5.2", "7.9"], "Porcine": ["7.9", "8.9"], "Elephant": ["5.2", "10"], "Lagomorph": ["0", "6.7"] } },
    { name: "Albumin", unit: "g/dL", ranges: { "Canine": ["2.6", "3.3"], "Feline": ["2.1", "3.3"], "Bovine": ["3.03", "3.55"], "Caprine": ["2.7", "3.9"], "Equine": ["2.6", "3.7"], "Porcine": ["1.9", "3.9"], "Elephant": ["1.5", "3.5"], "Lagomorph": ["0", "3.3"] } },
    { name: "Globulin", unit: "g/dL", ranges: { "Canine": ["2.7", "4.4"], "Feline": ["2.6", "5.1"], "Bovine": ["3.0", "3.48"], "Caprine": ["2.7", "4.1"], "Equine": ["2.62", "4.04"], "Porcine": ["5.29", "6.43"], "Elephant": ["3.7", "6.5"], "Lagomorph": ["0", "3.4"] } },
    { name: "Cholesterol", unit: "mg/dL", ranges: { "Canine": ["135", "270"], "Feline": ["95", "130"], "Bovine": ["8", "120"], "Caprine": ["80", "130"], "Equine": ["75", "150"], "Porcine": ["36", "54"], "Elephant": ["26", "68"], "Lagomorph": ["5.3", "71"] } },
    { name: "Triglyceride", unit: "mg/dL", ranges: { "Canine": ["20", "112"], "Feline": ["10", "114"], "Bovine": ["0", "14"], "Equine": ["4", "44"], "Elephant": ["15", "60"] } },
    { name: "Creatinine", unit: "mg/dL", ranges: { "Canine": ["0.5", "1.5"], "Feline": ["0.8", "1.8"], "Bovine": ["1.0", "2.0"], "Caprine": ["1.0", "1.8"], "Equine": ["1.2", "1.9"], "Porcine": ["1", "2.7"], "Elephant": ["1.1", "1.9"], "Lagomorph": ["0.8", "2.57"] } },
    { name: "Urea (BUN)", unit: "mg/dL", ranges: { "Canine": ["10", "28"], "Feline": ["20", "30"], "Bovine": ["20", "30"], "Caprine": ["10", "20"], "Equine": ["10", "24"], "Porcine": ["10", "30"], "Elephant": ["5", "20"] } },
    { name: "Amylase", unit: "U/L", ranges: { "Canine": ["185", "700"] } },
    { name: "Lipase", unit: "U/L", ranges: { "Canine": ["13", "200"], "Feline": ["0", "83"], "Elephant": ["10", "90"] } },
    { name: "CK (CPK)", unit: "U/L", ranges: { "Canine": ["0", "400"], "Bovine": ["0", "2000"], "Equine": ["0", "2000"], "Porcine": ["0", "2000"], "Elephant": ["0", "2000"] } },
    { name: "Calcium", unit: "mg/dL", ranges: { "Canine": ["9.0", "11.3"], "Feline": ["6.2", "10.2"], "Bovine": ["9.7", "12.4"], "Caprine": ["8.9", "11.7"], "Equine": ["11.2", "13.6"], "Porcine": ["7.1", "11.6"], "Elephant": ["9", "12"], "Lagomorph": ["5.84", "14.4"] } },
    { name: "Phosphorus", unit: "mg/dL", ranges: { "Canine": ["2.6", "6.2"], "Feline": ["4.5", "8.1"], "Bovine": ["5.6", "6.5"], "Caprine": ["4.2", "9.1"], "Equine": ["3.1", "5.6"], "Porcine": ["5.3", "9.6"], "Elephant": ["4", "6"], "Lagomorph": ["0", "4.5"] } },
    { name: "Magnesium", unit: "mg/dL", ranges: { "Canine": ["1.8", "2.4"], "Feline": ["1.8", "2.4"], "Bovine": ["1.8", "2.3"], "Caprine": ["2.8", "3.6"], "Equine": ["2.2", "2.8"], "Porcine": ["2.7", "3.7"], "Elephant": ["1.4", "2.6"], "Lagomorph": ["0", "2.3"] } },
    { name: "Sodium", unit: "mEq/L", ranges: { "Canine": ["141", "152"], "Feline": ["147", "156"], "Bovine": ["132", "152"], "Caprine": ["142", "155"], "Equine": ["132", "146"], "Porcine": ["135", "150"], "Elephant": ["120", "140"], "Lagomorph": ["0", "146"] } },
    { name: "Potassium", unit: "mEq/L", ranges: { "Canine": ["4.4", "5.3"], "Feline": ["4.0", "4.5"], "Bovine": ["3.9", "5.8"], "Caprine": ["3.5", "6.7"], "Equine": ["2.4", "4.7"], "Porcine": ["4.4", "6.7"], "Elephant": ["3", "6"], "Lagomorph": ["0", "5.8"] } },
    { name: "Chloride", unit: "mEq/L", ranges: { "Canine": ["105", "115"], "Feline": ["117", "123"], "Bovine": ["97", "111"], "Caprine": ["99", "110"], "Equine": ["99", "109"], "Porcine": ["94", "106"], "Elephant": ["100", "115"], "Lagomorph": ["85", "105"] } },
    { name: "Glucose", unit: "mg/dL", ranges: { "Canine": ["65", "118"], "Feline": ["73", "134"], "Bovine": ["45", "75"], "Caprine": ["50", "75"], "Equine": ["75", "115"], "Porcine": ["85", "115"], "Elephant": ["60", "116"], "Lagomorph": ["50", "93.2"] } }
  ];

  const speciesList = ["Canine", "Feline", "Bovine", "Caprine", "Equine", "Porcine", "Elephant", "Lagomorph"];
  for (const s of speciesList) {
    let [sp] = await db.select().from(species).where(eq(species.name, s));
    if (!sp) {
      log(`Creating missing species: ${s}`, "seed");
      await db.insert(species).values({ name: s });
    }
  }

  const getOrCreateCategory = async (name: string) => {
    let [cat] = await db.select().from(labTestCategories).where(eq(labTestCategories.name, name));
    if (!cat) {
      [cat] = await db.insert(labTestCategories).values({ name }).returning();
    }
    return cat.id;
  };

  const getOrCreateTest = async (name: string, categoryId: number, unit: string) => {
    let [test] = await db.select().from(labTests).where(and(eq(labTests.name, name), eq(labTests.categoryId, categoryId)));
    if (!test) {
      [test] = await db.insert(labTests).values({ name, categoryId, unit, sortOrder: 1 }).returning();
    } else if (test.unit !== unit) {
      await db.update(labTests).set({ unit }).where(eq(labTests.id, test.id));
    }
    return test.id;
  };

  const upsertRefRange = async (testId: number, speciesName: string, range: any) => {
    let [existing] = await db.select().from(labRefRanges).where(and(eq(labRefRanges.testId, testId), eq(labRefRanges.species, speciesName)));
    let min = null; let max = null; let refText = null;
    if (Array.isArray(range)) { min = range[0]; max = range[1]; } else { refText = range; }

    if (!existing) {
      await db.insert(labRefRanges).values({ testId, species: speciesName, min, max, refText });
    } else {
      await db.update(labRefRanges).set({ min, max, refText }).where(eq(labRefRanges.id, existing.id));
    }
  };

  const hemId = await getOrCreateCategory("Hematology");
  const bioId = await getOrCreateCategory("Biochemistry");

  for (const data of HAEMATOLOGY) {
    const testId = await getOrCreateTest(data.name, hemId, data.unit);
    for (const [sp, range] of Object.entries(data.ranges)) {
      await upsertRefRange(testId, sp, range);
    }
  }
  for (const data of BIOCHEMISTRY) {
    const testId = await getOrCreateTest(data.name, bioId, data.unit);
    for (const [sp, range] of Object.entries(data.ranges)) {
      await upsertRefRange(testId, sp, range);
    }
  }
  } // end if (refRangeCount < 50)

  // --- Seed Blood Smear Pathogens ---
  log("Checking blood smear pathogens...", "seed");
  const existingPathogens = await db.select().from(bloodSmearPathogens);
  if (existingPathogens.length === 0) {
    log(`Seeding ${defaultPathogens.length} default blood smear pathogens...`, "seed");
    for (const pathogen of defaultPathogens) {
      await db.insert(bloodSmearPathogens).values(pathogen);
    }
    log("Blood smear pathogens seeded.", "seed");
  } else {
    // Migration: Remove "Babesia canis / B. gibsoni" and add "Babesia canis" & "Babesia gibsoni" as separate pathogens
    const legacyPathogen = existingPathogens.find(p => p.species === "Canine" && p.name === "Babesia canis / B. gibsoni");
    if (legacyPathogen) {
      log("Migrating legacy pathogen 'Babesia canis / B. gibsoni'...", "seed");
      // Remove legacy entry
      await db.delete(bloodSmearPathogens).where(and(eq(bloodSmearPathogens.species, "Canine"), eq(bloodSmearPathogens.name, "Babesia canis / B. gibsoni")));
      
      // Ensure separate ones are added if not already present
      const hasCanis = existingPathogens.some(p => p.species === "Canine" && p.name === "Babesia canis");
      if (!hasCanis) {
        await db.insert(bloodSmearPathogens).values({ species: "Canine", name: "Babesia canis" });
      }
      const hasGibsoni = existingPathogens.some(p => p.species === "Canine" && p.name === "Babesia gibsoni");
      if (!hasGibsoni) {
        await db.insert(bloodSmearPathogens).values({ species: "Canine", name: "Babesia gibsoni" });
      }
      log("Legacy pathogen migration completed successfully.", "seed");
    }
  }

  log("Database seeded successfully! (Zero patient data - clean deployment)", "seed");
}

export async function ensurePlatformAdminSeed() {
  const existing = await db.select({ id: platformAdmins.id }).from(platformAdmins).where(eq(platformAdmins.email, "superadmin@petpointvet.in")).limit(1);
  if (existing.length > 0) return;
  log("Creating platform superadmin...", "seed");
  const password = await hashPassword("superadmin123");
  await db.insert(platformAdmins).values({
    name: "Super Admin",
    email: "superadmin@petpointvet.in",
    password,
    phone: "",
  });
}
