const { Pool } = require('pg');
const pool = new Pool({ 
  user: 'postgres', 
  password: 'Niharics%402026', 
  host: '127.0.0.1', 
  port: 5432, 
  database: 'vet_clinic' 
});

async function run() {
  const { rows } = await pool.query(
    "SELECT id, category, sub_category, description FROM expense_categories ORDER BY category, id"
  );
  console.log('All expense categories in DB:');
  rows.forEach(r => console.log(`  [${r.id}] ${r.category} > ${r.sub_category}`));
  await pool.end();
}

run().catch(e => { console.error('Error:', e.message); pool.end(); });
