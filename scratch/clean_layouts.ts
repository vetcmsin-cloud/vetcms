import 'dotenv/config';
import { db } from '../server/db';
import { clinicSettings } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const usgDefaultLayout = [
    { id: "hdr_customer_details_usg", type: "panel", isVisible: true, label: "Customer / Patient Details 1", panelKey: "customer_details_1", x: 40, y: 170, width: 714, height: 160 },
    { id: "body_usg_panel", type: "panel", isVisible: true, label: "USG / Ultrasonography Findings", panelKey: "usg_panel", position: "body", x: 40, y: 340, width: 714, height: 750 },
    { id: "body_notes_usg", type: "field", field: "notes", isVisible: true, label: "Notes", position: "body", x: 40, y: 1100, width: 714, height: 80 }
  ];

  const rows = await db.select().from(clinicSettings).where(eq(clinicSettings.settingKey, 'labReportLayout_Ultrasonography'));
  if (rows.length > 0) {
    await db.update(clinicSettings)
      .set({ settingValue: JSON.stringify(usgDefaultLayout) })
      .where(eq(clinicSettings.settingKey, 'labReportLayout_Ultrasonography'));
    console.log("Updated existing labReportLayout_Ultrasonography in DB.");
  } else {
    await db.insert(clinicSettings).values({
      settingKey: 'labReportLayout_Ultrasonography',
      settingValue: JSON.stringify(usgDefaultLayout)
    });
    console.log("Inserted clean labReportLayout_Ultrasonography into DB.");
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
