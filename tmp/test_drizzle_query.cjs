require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  const q = 'rocky';
  const pattern = '%' + q.toLowerCase() + '%';
  const res = await pool.query(`
    WITH matching_owners AS (
      SELECT DISTINCT o.id, o.first_name, o.last_name, o.email, o.phone, o.address
      FROM owners o
      LEFT JOIN pets p ON p.owner_id = o.id
      WHERE
        LOWER(o.first_name) LIKE $1 OR
        LOWER(COALESCE(o.last_name, '')) LIKE $1 OR
        LOWER(o.phone) LIKE $1 OR
        LOWER(COALESCE(p.name, '')) LIKE $1
    ),
    owner_activity AS (
      SELECT 
        mo.*,
        COALESCE(MAX(a.id), 0) as max_apt_id,
        COALESCE(MAX(inv.id), 0) as max_inv_id
      FROM matching_owners mo
      LEFT JOIN appointments a ON a.owner_id = mo.id
      LEFT JOIN invoices inv ON inv.owner_id = mo.id
      GROUP BY mo.id, mo.first_name, mo.last_name, mo.email, mo.phone, mo.address
    )
    SELECT id, first_name, last_name, email, phone, address
    FROM owner_activity
    ORDER BY GREATEST(max_apt_id, max_inv_id) DESC, id DESC
    LIMIT 50
  `, [pattern]);

  console.log('Results count:', res.rows.length);
  const sandeep = res.rows.find(r => r.phone === '9526630392');
  console.log('Sandeep found:', sandeep);
  await pool.end();
}

test().catch(e => { console.error(e); pool.end(); });
