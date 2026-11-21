
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://postgres:Niharics%402026@127.0.0.1:5432/vet_clinic"
});

async function run() {
  await client.connect();
  try {
    console.log("Adding reference_number column...");
    await client.query("ALTER TABLE purchases ADD COLUMN IF NOT EXISTS reference_number TEXT;");
    console.log("Adding unique constraint to purchase_number if missing...");
    // We can't easily do ADD COLUMN IF NOT EXISTS for constraints in all PG versions without a DO block,
    // but we can try to add it and ignore error if it exists.
    try {
        await client.query("ALTER TABLE purchases ADD CONSTRAINT purchases_purchase_number_unique UNIQUE (purchase_number);");
    } catch (e) {
        console.log("Constraint might already exist or could not be added: " + e.message);
    }
    console.log("Done.");
  } finally {
    await client.end();
  }
}

run().catch(console.error);
