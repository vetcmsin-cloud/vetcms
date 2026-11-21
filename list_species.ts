import 'dotenv/config';
import { db } from './server/db';
import { species } from './shared/schema';

async function listSpecies() {
  const all = await db.select().from(species);
  console.log(all);
  process.exit(0);
}

listSpecies();
