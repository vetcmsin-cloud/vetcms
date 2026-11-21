
import { db } from "../server/db";
import { bloodSmearPathogens } from "./schema";

async function check() {
  const all = await db.select().from(bloodSmearPathogens);
  console.log("Pathogens in DB:", JSON.stringify(all, null, 2));
  
  const { species } = await import("./schema");
  const allSpecies = await db.select().from(species);
  console.log("Species in DB:", JSON.stringify(allSpecies, null, 2));
  
  process.exit(0);
}

check();
