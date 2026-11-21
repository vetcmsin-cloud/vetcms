import 'dotenv/config';
import { db } from '../server/db';
import { clinicSettings } from '../shared/schema';

async function main() {
  const rows = await db.select().from(clinicSettings);
  for (const r of rows) {
    if (r.settingKey === 'labReportLayout_Ultrasonography') {
      console.log("labReportLayout_Ultrasonography JSON:");
      console.log(JSON.stringify(JSON.parse(r.settingValue), null, 2));
    }
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
