import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import {
  Database,
  IndianRupee,
  Receipt,
  ShieldCheck,
  UserCog,
  Settings,
} from "lucide-react";

const adminCards = [
  {
    title: "Backup Data",
    description: "Export all clinic data as a backup file",
    icon: Database,
    url: "/admin/backup",
    testId: "card-backup",
  },
  {
    title: "Fee Structure",
    description: "Manage consultation, treatment, and service fees",
    icon: IndianRupee,
    url: "/admin/fees",
    testId: "card-fees",
  },
  {
    title: "Billing & Invoices",
    description: "Create invoices, manage billing, and print receipts",
    icon: Receipt,
    url: "/admin/billing",
    testId: "card-billing",
  },
  {
    title: "User Roles",
    description: "Create and configure user roles with permissions",
    icon: ShieldCheck,
    url: "/admin/roles",
    testId: "card-roles",
  },
  {
    title: "User Rights",
    description: "Set individual permissions for each staff member",
    icon: UserCog,
    url: "/admin/user-rights",
    testId: "card-user-rights",
  },
];

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-admin-dashboard">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage clinic settings, billing, roles, and data backup.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminCards.map((card) => (
          <Link key={card.url} href={card.url}>
            <Card className="hover-elevate cursor-pointer h-full" data-testid={card.testId}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 flex-shrink-0">
                    <card.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-sm font-semibold">{card.title}</span>
                    <span className="text-xs text-muted-foreground">{card.description}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
