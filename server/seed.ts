import { db } from "./db";
import { users, roles, feeStructures, labTestCategories, labTests, labRefRanges, species } from "@shared/schema";
import { eq, and, not, inArray } from "drizzle-orm";
import { log } from "./logger";
import { hashPassword } from "./auth";

export async function seedDatabase() {
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

    // Ensure admin role exists if it was added later
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
          "accounts.view", "accounts.manage",
          "reports.view", "activity_log.view",
        ],
        isSystem: "true",
      });
    }
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

  const { LAB_REPORT_CATEGORIES } = await import("@shared/schema");

  // Seed default species
  const defaultSpecies = ["Dog", "Cat", "Cow", "Horse", "Bird"];
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
        { name: "Platelet Count", unit: "/µL", sortOrder: 5, min: "200000", max: "500000" },
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

          // Add default reference range for Dog
          await db.insert(labRefRanges).values({
            testId: newTest.id,
            species: "Dog",
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

          // Add default reference range for Dog
          await db.insert(labRefRanges).values({
            testId: newTest.id,
            species: "Dog",
            min: t.min,
            max: t.max
          });
        }
      }
    }
  }

  // ── USERS: Only seed Super Admin and Admin ────────────────────
  const superAdminExists = await db.select().from(users).where(eq(users.email, "superadmin@petpointvet.in"));
  if (superAdminExists.length === 0) {
    log("Creating superadmin user...", "seed");
    const hashedSuperPw = await hashPassword("superadmin123");
    await db.insert(users).values({
      name: "Super Admin",
      email: "superadmin@petpointvet.in",
      password: hashedSuperPw,
      role: "superadmin",
      phone: "",
    });
  } else {
    log("Superadmin exists, ensuring role is correct...", "seed");
    const hashedSuperPw = await hashPassword("superadmin123");
    await db.update(users)
      .set({ role: "superadmin", password: hashedSuperPw })
      .where(eq(users.email, "superadmin@petpointvet.in"));
  }

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
    log("Admin exists, ensuring role is correct...", "seed");
    const hashedAdminPw = await hashPassword("admin123");
    await db.update(users)
      .set({ role: "admin", password: hashedAdminPw })
      .where(eq(users.email, "admin@petpointvet.in"));
  }

  log("Database seeded successfully! (Zero patient data - clean deployment)", "seed");
}
