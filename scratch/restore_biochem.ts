import 'dotenv/config';
import { db } from '../server/db';
import { clinicSettings } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Restore the original Biochemistry layout (chemistry_panel + customer_details)
// The browser agent accidentally replaced chemistry_panel with biochemistry_panel
async function main() {
  const originalBiochemLayout = [
    {
      "id": "panel-1772742895346-4l9hff6z0",
      "type": "panel",
      "isVisible": true,
      "label": "Blood Chemistry Panel",
      "x": 96.25,
      "y": 361.25,
      "width": 643,
      "height": 569,
      "panelKey": "chemistry_panel"
    },
    {
      "id": "panel-1772742917540-k5frca9b6",
      "type": "panel",
      "isVisible": true,
      "label": "Customer / Patient Details",
      "x": 41.5,
      "y": 115.75,
      "width": 700,
      "height": 200,
      "panelKey": "customer_details"
    }
  ];

  await db.update(clinicSettings)
    .set({ settingValue: JSON.stringify(originalBiochemLayout) })
    .where(eq(clinicSettings.settingKey, 'labReportLayout_Biochemistry'));
  
  console.log("Restored labReportLayout_Biochemistry to original chemistry_panel layout");
  
  // Verify
  const rows = await db.select().from(clinicSettings).where(eq(clinicSettings.settingKey, 'labReportLayout_Biochemistry'));
  console.log("Verified:", JSON.stringify(JSON.parse(rows[0].settingValue).map((s: any) => s.panelKey)));
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
