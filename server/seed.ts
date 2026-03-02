import { db } from "./db";
import { owners, pets, appointments, medicalRecords, users, roles, feeStructures, labTestCategories, labTests, labRefRanges, species } from "@shared/schema";
import { eq, and } from "drizzle-orm";
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
      ],
      isSystem: "true",
    });
    await db.insert(roles).values({
      name: "doctor",
      description: "Clinical access including medical records and appointments",
      permissions: [
        "dashboard.view", "patients.view", "patients.create", "patients.edit",
        "owners.view", "owners.create", "owners.edit",
        "appointments.view", "appointments.create", "appointments.edit",
        "medical_records.view", "medical_records.create", "medical_records.delete",
        "billing.view", "billing.create", "billing.edit",
      ],
      isSystem: "true",
    });
    await db.insert(roles).values({
      name: "receptionist",
      description: "Front desk access for managing appointments and owners",
      permissions: [
        "dashboard.view", "patients.view", "patients.create", "patients.edit",
        "owners.view", "owners.create", "owners.edit",
        "appointments.view", "appointments.create", "appointments.edit",
        "billing.view",
      ],
      isSystem: "true",
    });
    await db.insert(roles).values({
      name: "pharmacy",
      description: "Pharmacy staff - can add medicine prices to forwarded invoices",
      permissions: [
        "dashboard.view", "patients.view", "billing.view", "billing.edit",
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
        ]
      })
      .where(eq(roles.name, "superadmin"));

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

  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    log("Creating default users...", "seed");

    const hashedSuperPw = await hashPassword("superadmin123");
    await db.insert(users).values({
      name: "Super Admin",
      email: "superadmin@petpointvet.in",
      password: hashedSuperPw,
      role: "superadmin",
    });

    const hashedPw = await hashPassword("admin123");
    await db.insert(users).values({
      name: "Admin",
      email: "admin@petpointvet.in",
      password: hashedPw,
      role: "admin",
    });

    const hashedDocPw = await hashPassword("doctor123");
    await db.insert(users).values({
      name: "Dr. Varsha",
      email: "varsha@petpointvet.in",
      password: hashedDocPw,
      role: "doctor",
    });

    const hashedRecPw = await hashPassword("reception123");
    await db.insert(users).values({
      name: "Receptionist User",
      email: "rec@petpointvet.in",
      password: hashedRecPw,
      role: "receptionist",
    });
  }

  const superAdminExists = await db.select().from(users).where(eq(users.email, "superadmin@petpointvet.in"));
  if (superAdminExists.length === 0) {
    log("Creating superadmin user...", "seed");
    const hashedSuperPw = await hashPassword("superadmin123");
    await db.insert(users).values({
      name: "Super Admin",
      email: "superadmin@petpointvet.in",
      password: hashedSuperPw,
      role: "superadmin",
    });
  } else {
    log("Superadmin exists, ensuring password and role...", "seed");
    const hashedSuperPw = await hashPassword("superadmin123");
    await db.update(users)
      .set({
        role: "superadmin",
        password: hashedSuperPw
      })
      .where(eq(users.email, "superadmin@petpointvet.in"));
  }

  const adminExists = await db.select().from(users).where(eq(users.email, "admin@petpointvet.in"));
  const hashedAdminPw = await hashPassword("admin123");
  if (adminExists.length === 0) {
    log("Creating normal admin user...", "seed");
    await db.insert(users).values({
      name: "Admin",
      email: "admin@petpointvet.in",
      password: hashedAdminPw,
      role: "admin",
    });
  } else {
    log("Admin exists, ensuring password and role...", "seed");
    await db.update(users)
      .set({
        role: "admin",
        password: hashedAdminPw
      })
      .where(eq(users.email, "admin@petpointvet.in"));
  }

  const existingOwners = await db.select().from(owners);
  if (existingOwners.length > 0) {
    log("Database already seeded, skipping...", "seed");
    return;
  }

  log("Seeding database with sample data...", "seed");

  const [owner1] = await db.insert(owners).values({
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@email.com",
    phone: "(555) 234-5678",
    address: "142 Oak Street, Springfield, IL 62701",
  }).returning();

  const [owner2] = await db.insert(owners).values({
    firstName: "Michael",
    lastName: "Chen",
    email: "m.chen@email.com",
    phone: "(555) 345-6789",
    address: "89 Maple Avenue, Portland, OR 97201",
  }).returning();

  const [owner3] = await db.insert(owners).values({
    firstName: "Emily",
    lastName: "Rodriguez",
    email: "emily.r@email.com",
    phone: "(555) 456-7890",
    address: "225 Pine Road, Austin, TX 73301",
  }).returning();

  const [owner4] = await db.insert(owners).values({
    firstName: "James",
    lastName: "Williams",
    email: "j.williams@email.com",
    phone: "(555) 567-8901",
    address: "17 Elm Court, Denver, CO 80201",
  }).returning();

  const [pet1] = await db.insert(pets).values({
    name: "Buddy",
    species: "Dog",
    breed: "Golden Retriever",
    age: 4,
    weight: "32.50",
    gender: "Male",
    imageUrl: "/images/seed-dog-1.png",
    ownerId: owner1.id,
  }).returning();

  const [pet2] = await db.insert(pets).values({
    name: "Whiskers",
    species: "Cat",
    breed: "Tabby",
    age: 3,
    weight: "4.80",
    gender: "Female",
    imageUrl: "/images/seed-cat-1.png",
    ownerId: owner2.id,
  }).returning();

  const [pet3] = await db.insert(pets).values({
    name: "Coco",
    species: "Dog",
    breed: "Poodle",
    age: 2,
    weight: "5.20",
    gender: "Female",
    imageUrl: "/images/seed-dog-2.png",
    ownerId: owner3.id,
  }).returning();

  const [pet4] = await db.insert(pets).values({
    name: "Luna",
    species: "Cat",
    breed: "Persian",
    age: 5,
    weight: "5.50",
    gender: "Female",
    imageUrl: "/images/seed-cat-2.png",
    ownerId: owner3.id,
  }).returning();

  const [pet5] = await db.insert(pets).values({
    name: "Rex",
    species: "Dog",
    breed: "German Shepherd",
    age: 6,
    weight: "38.00",
    gender: "Male",
    imageUrl: "/images/seed-dog-3.png",
    ownerId: owner4.id,
  }).returning();

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const [apt1] = await db.insert(appointments).values({
    petId: pet1.id,
    ownerId: owner1.id,
    date: fmt(today),
    time: "09:00",
    type: "Check-up",
    status: "scheduled",
    notes: "Annual wellness exam",
  }).returning();

  await db.insert(appointments).values({
    petId: pet2.id,
    ownerId: owner2.id,
    date: fmt(today),
    time: "10:30",
    type: "Vaccination",
    status: "scheduled",
    notes: "Booster shots due",
  });

  await db.insert(appointments).values({
    petId: pet3.id,
    ownerId: owner3.id,
    date: fmt(tomorrow),
    time: "14:00",
    type: "Grooming",
    status: "scheduled",
    notes: "Full grooming service",
  });

  await db.insert(appointments).values({
    petId: pet5.id,
    ownerId: owner4.id,
    date: fmt(nextWeek),
    time: "11:00",
    type: "X-Ray",
    status: "scheduled",
    notes: "Check hip joint",
  });

  await db.insert(appointments).values({
    petId: pet4.id,
    ownerId: owner3.id,
    date: fmt(yesterday),
    time: "15:30",
    type: "Dental",
    status: "completed",
    notes: "Dental cleaning completed",
  });

  await db.insert(medicalRecords).values({
    petId: pet1.id,
    date: fmt(lastWeek),
    diagnosis: "Mild ear infection",
    treatment: "Ear cleaning and antibiotic drops prescribed",
    prescription: "Otibiotic Ointment - Apply twice daily for 10 days",
    veterinarian: "Sarah Mitchell",
    notes: "Follow-up in 2 weeks. Keep ears dry.",
  });

  await db.insert(medicalRecords).values({
    petId: pet2.id,
    date: fmt(lastWeek),
    diagnosis: "Annual wellness - All clear",
    treatment: "Routine examination, vaccinations updated",
    prescription: "None",
    veterinarian: "Robert Kim",
    notes: "Healthy weight, good dental condition. Next check-up in 12 months.",
  });

  await db.insert(medicalRecords).values({
    petId: pet5.id,
    date: fmt(yesterday),
    diagnosis: "Minor skin irritation on right paw",
    treatment: "Topical antiseptic applied, medicated shampoo recommended",
    prescription: "Chlorhexidine shampoo - Use during baths for 3 weeks",
    veterinarian: "Sarah Mitchell",
    notes: "Monitor for improvement. Return if redness persists.",
  });

  await db.insert(medicalRecords).values({
    petId: pet4.id,
    date: fmt(yesterday),
    diagnosis: "Dental calculus buildup",
    treatment: "Professional dental cleaning under light sedation",
    prescription: "Dental chews daily",
    veterinarian: "Robert Kim",
    notes: "Teeth cleaned successfully. Recommend daily dental care.",
  });

  log("Database seeded successfully!", "seed");
}
