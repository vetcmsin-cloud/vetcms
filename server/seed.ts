import { db } from "./db";
import { owners, pets, appointments, medicalRecords } from "@shared/schema";
import { log } from "./index";

export async function seedDatabase() {
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
