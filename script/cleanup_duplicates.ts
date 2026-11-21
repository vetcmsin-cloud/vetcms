import 'dotenv/config';
import { db } from "../server/db";
import { labTests, labRefRanges } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

async function main() {
    const duplicateIds = [1, 2, 10]; // Hemoglobin, PCV, Platelets (based on tests.json)

    console.log("Checking for duplicate lab reference ranges...");
    const deletedRanges = await db.delete(labRefRanges).where(inArray(labRefRanges.testId, duplicateIds)).returning();
    console.log(`Deleted ${deletedRanges.length} duplicate reference ranges.`);

    console.log("Checking for duplicate lab tests...");
    const deletedTests = await db.delete(labTests).where(inArray(labTests.id, duplicateIds)).returning();
    console.log(`Deleted ${deletedTests.length} duplicate tests.`);

    process.exit(0);
}

main().catch(console.error);
