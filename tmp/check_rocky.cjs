require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const petsRes = await pool.query("SELECT * FROM pets WHERE LOWER(name) LIKE '%rocky%'");
  console.log('Pets named Rocky:', petsRes.rows);
  
  const sandeepRes = await pool.query("SELECT * FROM owners WHERE LOWER(first_name) LIKE '%sandeep%' OR LOWER(last_name) LIKE '%sandeep%'");
  console.log('Sandeep owners:', sandeepRes.rows);
  
  if (sandeepRes.rows.length > 0) {
    const sIds = sandeepRes.rows.map(o => o.id);
    const sPets = await pool.query("SELECT * FROM pets WHERE owner_id = ANY($1::int[])", [sIds]);
    console.log('Pets belonging to Sandeep:', sPets.rows);
  }
  
  await pool.end();
}

check().catch(e => { console.error(e); pool.end(); });
