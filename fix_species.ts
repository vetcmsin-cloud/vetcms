import 'dotenv/config';
import { db } from './server/db';
import { species } from './shared/schema';

async function updateSpecies() {
  const allSpecies = await db.select().from(species);
  console.log(allSpecies);
  process.exit(0);
}

updateSpecies();
