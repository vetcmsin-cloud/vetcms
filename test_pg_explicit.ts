import pg from 'pg';

const pool = new pg.Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'postgres',
  password: 'Niharics@2026',
  port: 5432,
});

try {
  console.log('Testing connection to postgres with explicit credentials...');
  const client = await pool.connect();
  console.log('Connected to postgres database!');
  client.release();
} catch (e) {
  console.error('Connection failed:', e);
}
await pool.end();
process.exit(0);
