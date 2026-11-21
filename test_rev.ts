import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { invoices } from '@shared/schema';

async function run() {
    const allInvoices = await db.select().from(invoices).where(sql`status = 'paid'`);

    // Server-side logic replica (routes.ts line 1285)
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const serverTodayRevenue = allInvoices
        .filter((inv) => {
            if (inv.createdAt) {
                const createdDate = new Date(inv.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                return createdDate === todayIST;
            }
            return inv.date === todayIST;
        })
        .reduce((sum, inv) => sum + parseFloat(String(inv.total)), 0);

    // Client-side logic replica (accounts.tsx line 171)
    const clientTodayRevenue = allInvoices
        .filter(inv => {
            if (inv.createdAt) {
                const d = new Date(inv.createdAt).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
                return d === todayIST;
            }
            return inv.date === todayIST;
        })
        .reduce((sum, inv) => sum + parseFloat(inv.total || "0"), 0);

    console.log("todayIST", todayIST);
    console.log("serverTodayRevenue", serverTodayRevenue);
    console.log("clientTodayRevenue", clientTodayRevenue);

    process.exit(0);
}
run();
