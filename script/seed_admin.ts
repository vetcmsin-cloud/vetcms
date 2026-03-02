
import 'dotenv/config';
import { storage } from "../server/storage";
import { hashPassword } from "../server/auth";
import { seedDatabase } from "../server/seed";

async function main() {
    try {
        console.log("Ensuring default roles and data exist...");
        await seedDatabase();

        // 1. Ensure Super Admin exists
        let superAdmin = await storage.getUserByEmail("superadmin@petpointvet.in");
        const hashedSuperPw = await hashPassword("superadmin123");

        if (!superAdmin) {
            console.log("Creating superadmin user...");
            // Create user logic...
            // NOTE: createUser expects InsertUser, check schema. username/specialization might not be in schema.
            // Based on schema.ts: name, email, password, role, permissions.
            await storage.createUser({
                email: "superadmin@petpointvet.in",
                password: hashedSuperPw,
                role: "superadmin",
                name: "Super Admin",
                permissions: [],
            });
            console.log("Super Admin created: superadmin@petpointvet.in / superadmin123");
        } else {
            console.log("Super Admin exists. Updating password...");
            await storage.updateUser(superAdmin.id, {
                password: hashedSuperPw,
                role: "superadmin"
            });
            console.log("Updated Super Admin credentials");
        }

        // 2. Ensure Normal Admin exists
        let admin = await storage.getUserByEmail("admin@petpointvet.in");
        const hashedAdminPw = await hashPassword("admin123");

        if (!admin) {
            console.log("Creating normal admin user...");
            await storage.createUser({
                email: "admin@petpointvet.in",
                password: hashedAdminPw,
                role: "admin",
                name: "System Admin",
                permissions: [],
            });
            console.log("Normal Admin created: admin@petpointvet.in / admin123");
        } else {
            console.log("Admin exists. Updating password and role...");
            await storage.updateUser(admin.id, {
                password: hashedAdminPw,
                role: "admin"
            });
            console.log("Updated Normal Admin credentials");
        }

        console.log("Seeding complete.");
        console.log("--------------------------------");
        console.log("Super Admin: superadmin@petpointvet.in / superadmin123");
        console.log("Normal Admin: admin@petpointvet.in / admin123");
        console.log("--------------------------------");

    } catch (error) {
        console.error("Error seeding database:", error);
    }
}

main();
