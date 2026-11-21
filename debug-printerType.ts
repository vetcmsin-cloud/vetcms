import { db } from './server/db.js';
import { clinicSettings } from './shared/schema.js';

async function main() {
    const settings = await db.select().from(clinicSettings);
    let output = {};
    for (let s of settings) {
        if (s.settingKey && s.settingKey.includes('printerType')) output[s.settingKey] = s.settingValue;
    }
    console.log(output);
    process.exit(0);
}
main();
