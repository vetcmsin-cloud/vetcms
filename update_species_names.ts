import 'dotenv/config';
import { db } from './server/db';
import { species, pets, labRefRanges, bloodSmearPathogens } from './shared/schema';
import { eq, ilike } from 'drizzle-orm';

const MAPPING: Record<string, string> = {
  'Dog': 'Canine',
  'Cat': 'Feline',
  'Cow': 'Bovine',
  'Horse': 'Equine',
  'Bird': 'Avian',
  'Goat': 'Caprine',
  'Pig': 'Porcine',
  'Rabbit': 'Lagomorph'
};

async function updateSpeciesData() {
  for (const [oldName, newName] of Object.entries(MAPPING)) {
    console.log(`Updating ${oldName} to ${newName}`);
    
    // Update species table
    try {
      await db.update(species)
        .set({ name: newName })
        .where(ilike(species.name, oldName));
      console.log(`- species table updated`);
    } catch (e: any) {
      console.log(`- species error:`, e.message);
    }

    // Update pets table
    try {
      await db.update(pets)
        .set({ species: newName })
        .where(ilike(pets.species, oldName));
      console.log(`- pets table updated`);
    } catch (e: any) {
      console.log(`- pets error:`, e.message);
    }

    // Update labRefRanges table
    try {
      await db.update(labRefRanges)
        .set({ species: newName })
        .where(ilike(labRefRanges.species, oldName));
      console.log(`- labRefRanges updated`);
    } catch (e: any) {
      console.log(`- ref ranges error:`, e.message);
    }

    // Update bloodSmearPathogens table
    try {
      await db.update(bloodSmearPathogens)
        .set({ species: newName })
        .where(ilike(bloodSmearPathogens.species, oldName));
      console.log(`- bloodSmearPathogens updated`);
    } catch (e: any) {
      console.log(`- pathogens error:`, e.message);
    }
  }

  const allSpecies = await db.select().from(species);
  console.log("Current species after update:", allSpecies);
  process.exit(0);
}

updateSpeciesData();
