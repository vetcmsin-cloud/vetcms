
import 'dotenv/config';
import { storage } from "../server/storage";
import { hashPassword } from "../server/auth";
import { seedDatabase } from "../server/seed";
import { ensureTenantSchema } from "../server/multitenancy";
import { runWithTenant } from "../server/db";

async function main() {
    try {
        const legacyTenantId = await ensureTenantSchema();
        await runWithTenant(legacyTenantId, async () => {
        console.log("Ensuring default roles and data exist...");
        await seedDatabase();

        // Ensure the clinic-local admin exists
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
        console.log("Platform Super Admin: superadmin@petpointvet.in / superadmin123");
        console.log("Normal Admin: admin@petpointvet.in / admin123");
        console.log("--------------------------------");
        });

    } catch (error) {
        console.error("Error seeding database:", error);
    }
}

main();
