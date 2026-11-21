import pg from 'pg';

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:Niharics%402026@127.0.0.1:5432/postgres",
});

try {
  console.log('Testing connection to postgres database...');
  const client = await pool.connect();
  console.log('Connected to postgres database!');
  const res = await client.query('SELECT datname FROM pg_database WHERE datname = $1', ['vet_clinic']);
  if (res.rows.length > 0) {
    console.log('Database vet_clinic exists.');
  } else {
    console.log('Database vet_clinic DOES NOT exist.');
  }
  client.release();
} catch (e) {
  console.error('Connection to postgres failed:', e);
}
await pool.end();
process.exit(0);
