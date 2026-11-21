import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

try {
  console.log('Testing DB connection...');
  const result = await db.execute(sql`SELECT 1`);
  console.log('DB connection successful!', result.rows);
} catch (e) {
  console.error('DB connection failed:');
  console.error(e);
}
process.exit(0);
