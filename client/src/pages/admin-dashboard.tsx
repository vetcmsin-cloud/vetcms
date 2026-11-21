import { useState } from "react";
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
  Stethoscope,
  Eye,
  EyeOff,
  TrendingUp,
  CalendarDays,
  Package,
  Calendar,
  Wallet,
  Ticket,
  ClipboardList,
  Globe,
} from "lucide-react";

// ── Blur-toggle Amount ─────────────────────────────────────────────────────────
function BlurAmount({
  value,
  loading,
  revealed,
  onReveal,
}: {
  value: string;
  loading?: boolean;
  revealed: boolean;
  onReveal: () => void;
}) {
  if (loading) return <Skeleton className="h-7 w-24" />;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onReveal(); }}
      className="flex items-center gap-1.5 group focus:outline-none"
      title={revealed ? "Click to hide" : "Click to reveal"}
    >
      <span
        className={`text-2xl font-bold tracking-tight transition-all duration-300 select-none ${revealed ? "" : "blur-[6px] pointer-events-none"
          }`}
      >
        {value}
      </span>
      <span className="opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground">
        {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </span>
    </button>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  isAmount,
  revealed,
  onReveal,
  accent,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
  isAmount?: boolean;
  revealed?: boolean;
  onReveal?: () => void;
  accent?: string; // tailwind color class for border-left
}) {
  return (
    <Card className={`overflow-hidden ${accent ? `border-l-4 ${accent}` : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{title}</span>
            {isAmount && revealed !== undefined && onReveal ? (
              <BlurAmount
                value={String(value)}
                loading={loading}
                revealed={revealed}
                onReveal={onReveal}
              />
            ) : loading ? (
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
  {
    title: "Accounts Settings",
    description: "Configure Accounts module settings and Expense Categories",
    icon: Wallet,
    url: "/admin/accounts-settings",
    testId: "card-accounts-settings",
  },
  {
    title: "Medical Settings",
    description: "Create and manage treatment plan templates for SOAP note consultations",
    icon: Stethoscope,
    url: "/admin/medical-settings",
    testId: "card-medical-settings",
  },
  {
    title: "Inventory Settings",
    description: "Manage product units, categories and sub-categories for inventory",
    icon: Package,
    url: "/admin/inventory-settings",
    testId: "card-inventory-settings",
  },
  {
    title: "Financial Year",
    description: "Set and manage the active financial year for accounting",
    icon: Calendar,
    url: "/admin/financial-year",
    testId: "card-financial-year",
  },
  {
    title: "Vouchers",
    description: "Configure expense and payment voucher templates",
    icon: Ticket,
    url: "/admin/vouchers",
    testId: "card-vouchers",
  },
  {
    title: "Users",
    description: "Create, edit, and manage system user accounts",
    icon: Users,
    url: "/admin/users",
    testId: "card-users",
  },
  {
    title: "Activity Log",
    description: "View detailed audit logs of all user actions",
    icon: ClipboardList,
    url: "/admin/activity-log",
    testId: "card-activity-log",
  },
  {
    title: "General Settings",
    description: "Timezone and regional preferences for the entire application",
    icon: Globe,
    url: "/admin/general-settings",
    testId: "card-general-settings",
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();

  // Each revenue amount has its own reveal state, starts blurred
  const [todayRevealed, setTodayRevealed] = useState(false);
  const [totalRevealed, setTotalRevealed] = useState(false);

  const { data: stats, isLoading } = useQuery<{
    totalRevenue: number;
    todayRevenue: number;
    totalUsers: number;
    pendingInvoices: number;
  }>({
    queryKey: ["/api/admin/stats"],
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const visibleCards = adminCards.filter((card) => {
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

      {/* Stat Cards — revenue amounts blurred by default */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue — shown first */}
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats?.todayRevenue || 0)}
          icon={CalendarDays}
          loading={isLoading}
          description="Paid invoices today"
          isAmount
          revealed={todayRevealed}
          onReveal={() => setTodayRevealed((v) => !v)}
          accent="border-l-amber-400"
        />

        {/* Total Revenue */}
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={TrendingUp}
          loading={isLoading}
          description="All-time from paid invoices"
          isAmount
          revealed={totalRevealed}
          onReveal={() => setTotalRevealed((v) => !v)}
          accent="border-l-emerald-500"
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

      {/* Hint text */}
      <p className="text-[11px] text-muted-foreground flex items-center gap-1 -mt-3">
        <Eye className="w-3 h-3" />
        Revenue amounts are hidden for privacy — click to reveal.
      </p>

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
