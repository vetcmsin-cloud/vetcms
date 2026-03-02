import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database,
  IndianRupee,
  Receipt,
  ShieldCheck,
  UserCog,
  Settings,
  Trash2,
  Wrench,
  Users,
  Clock,
  FlaskConical,
} from "lucide-react";

// ... existing StatCard component ...

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{title}</span>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="text-2xl font-bold tracking-tight">{value}</span>
            )}
            {description && (
              <span className="text-[11px] text-muted-foreground">{description}</span>
            )}
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
  {
    title: "Design Studio",
    description: "Design invoices, lab reports, and medical reports with drag-and-drop canvas",
    icon: Wrench,
    url: "/admin/settings",
    testId: "card-settings",
  },
  {
    title: "Data Management",
    description: "View data counts and erase clinic data (super admin only)",
    icon: Trash2,
    url: "/admin/data",
    testId: "card-data",
  },
  {
    title: "Lab Settings",
    description: "Configure species, lab tests, and species-specific reference ranges",
    icon: FlaskConical,
    url: "/admin/lab-settings",
    testId: "card-lab-settings",
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery<{
    totalRevenue: number;
    totalUsers: number;
    pendingInvoices: number;
  }>({
    queryKey: ["/api/admin/stats"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const visibleCards = adminCards.filter(card => {
    if (card.title === "Data Management") {
      return user?.role === "superadmin";
    }
    return true;
  });

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={IndianRupee}
          loading={isLoading}
          description="Total from paid invoices"
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          loading={isLoading}
          description="Registered system users"
        />
        <StatCard
          title="Pending Invoices"
          value={stats?.pendingInvoices || 0}
          icon={Clock}
          loading={isLoading}
          description="Invoices awaiting payment"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCards.map((card) => (
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
