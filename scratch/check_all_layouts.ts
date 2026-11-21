import 'dotenv/config';
import { db } from '../server/db';
import { clinicSettings } from '../shared/schema';

async function main() {
  const rows = await db.select().from(clinicSettings);
  console.log("All labReportLayout* keys in DB:");
  for (const r of rows) {
    if (r.settingKey.startsWith('labReportLayout')) {
      const sections = JSON.parse(r.settingValue);
      console.log(`\n=== ${r.settingKey} ===`);
      for (const s of sections) {
        console.log(`  type: ${s.type}, panelKey: ${s.panelKey || s.field}, label: ${s.label}`);
      }
    }
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
