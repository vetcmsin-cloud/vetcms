import 'dotenv/config';
import { db } from "../server/db";
import { labTests, labTestCategories } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import fs from 'fs';

async function main() {
    const cats = await db.select().from(labTestCategories);
    const hemId = cats.find((c: any) => c.name === 'Hematology')?.id;
    if (hemId) {
        const tests = await db.select().from(labTests).where(eq(labTests.categoryId, hemId));
        fs.writeFileSync('tests.json', JSON.stringify(tests.map((t: any) => ({ id: t.id, name: t.name })), null, 2));
    }
    process.exit(0);
}

main().catch(console.error);
