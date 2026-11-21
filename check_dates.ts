import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { invoices } from '@shared/schema';

async function run() {
    const result = await db.execute(sql`
    SELECT 
      DATE(created_at) as created_date,
      date as user_date,
      count(*) as count,
      SUM(total) as total_sum
    FROM invoices 
    WHERE status = 'paid'
    GROUP BY 1, 2 
    ORDER BY 1 DESC
  `);
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
}
run();
