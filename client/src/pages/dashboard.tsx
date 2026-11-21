import { useState } from "react";
import { format } from "date-fns";
import { formatTime12h } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PawPrint,
  Users,
  CalendarDays,
  FileText,
  Clock,
  TrendingUp,
  Activity,
  CalendarCheck,
  Stethoscope,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
} from "lucide-react";
import type { Pet, Owner, Appointment, InventoryItem } from "@shared/schema";
import { PatientChart } from "@/components/patient-chart";
import { useAuth } from "@/hooks/use-auth";
import { AddAppointmentDialog } from "@/components/add-appointment-dialog";
import { Link } from "wouter";
import { openNewInvoiceTerminal } from "@/components/NewInvoiceTerminal";
import { Plus, Receipt } from "lucide-react";

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
  testId,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  loading?: boolean;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{title}</span>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <span className="text-2xl font-bold tracking-tight" data-testid={`${testId}-value`}>
                {value}
              </span>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3 text-chart-2" />
                <span className="text-[11px] text-chart-2 font-medium">{trend}</span>
              </div>
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

function statusColor(status: string) {
  switch (status) {
    case "scheduled":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
      return "destructive";
    case "in-progress":
      return "default";
    default:
      return "secondary";
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [chartOpen, setChartOpen] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  // Single lightweight endpoint replaces 3 heavy full-table-dump queries
  const { data: summary, isLoading: summaryLoading } = useQuery<{
    counts: {
      totalPets: number;
      totalOwners: number;
      totalAppointments: number;
      todayScheduled: number;
      todayPending: number;
      todayCompleted: number;
      todayCancelled: number;
    };
    upcomingAppointments: Appointment[];
    recentPets: Pet[];
    recentOwners: Owner[];
    appointmentPets: Pet[];
    appointmentOwners: Owner[];
  }>({
    queryKey: ["/api/dashboard/summary"],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/summary?date=${today}`, {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store",
          "Pragma": "no-cache",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard summary");
      return res.json();
    },
  });

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/clinic-settings"],
  });

  const counts = summary?.counts || { totalPets: 0, totalOwners: 0, totalAppointments: 0, todayScheduled: 0, todayPending: 0, todayCompleted: 0, todayCancelled: 0 };
  const todayAppointments = summary?.upcomingAppointments?.filter(a => a.date === today) || [];
  const upcomingAppointments = summary?.upcomingAppointments || [];
  const recentPets = summary?.recentPets || [];
  const aptPets = summary?.appointmentPets || [];
  const aptOwners = summary?.appointmentOwners || [];
  const recentOwners = summary?.recentOwners || [];

  // Group upcoming appointments by date
  const upcomingByDate = upcomingAppointments.reduce<Record<string, typeof upcomingAppointments>>((acc, apt) => {
    if (!acc[apt.date]) acc[apt.date] = [];
    acc[apt.date].push(apt);
    return acc;
  }, {});
  const upcomingDates = Object.keys(upcomingByDate).sort((a, b) => {
    if (a === today) return -1;
    if (b === today) return 1;
    return a.localeCompare(b);
  });

  const canConsult = user?.role === "doctor" || user?.role === "admin" || user?.role === "superadmin";

  const handleConsult = (petId: number) => {
    const pet = aptPets?.find((p) => p.id === petId);
    if (pet) {
      setSelectedPet(pet);
      setChartOpen(true);
    }
  };

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === today) return "Today";
    const tomorrow = format(new Date(new Date().setDate(new Date().getDate() + 1)), "yyyy-MM-dd");
    if (dateStr === tomorrow) return "Tomorrow";
    // Append T00:00:00 so JS parses as local time (not UTC midnight which shifts date in IST)
    return format(new Date(dateStr + "T00:00:00"), "EEE, MMM d");
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-dashboard">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back to {settings?.clinicName || "PetPoint Pro"}. Here's your clinic overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNewInvoiceTerminal} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            <Receipt className="w-4 h-4" />
            New Invoice
          </Button>
          <AddAppointmentDialog />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Today's Appointments"
          value={counts.todayScheduled}
          icon={CalendarCheck}
          loading={summaryLoading}
          testId="stat-today"
        />
        <StatCard
          title="Consultation Pending"
          value={counts.todayPending}
          icon={Clock}
          loading={summaryLoading}
          testId="stat-pending"
        />
        <StatCard
          title="Consultation Completed"
          value={counts.todayCompleted}
          icon={CheckCircle}
          loading={summaryLoading}
          testId="stat-completed"
        />
        <StatCard
          title="Cancelled Appointments"
          value={counts.todayCancelled}
          icon={XCircle}
          loading={summaryLoading}
          testId="stat-cancelled"
        />
        <StatCard
          title="Total Appointments"
          value={counts.totalAppointments}
          icon={CalendarDays}
          loading={summaryLoading}
          testId="stat-appointments"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Upcoming Appointments
              </CardTitle>
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                {upcomingAppointments.length} upcoming
              </Badge>
              <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                {upcomingDates.length} {upcomingDates.length === 1 ? "day" : "days"}
              </Badge>
            </div>
            <Link href="/appointments">
              <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-primary hover:text-primary">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {summaryLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CalendarDays className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm">No upcoming appointments</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {upcomingDates.map((dateStr) => (
                  <div key={dateStr} className="flex flex-col gap-2">
                    {/* Date separator header */}
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${dateStr === today
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                        }`}>
                        <CalendarDays className="w-3 h-3" />
                        {formatDateLabel(dateStr)}
                        <span className="opacity-70">·</span>
                        <span>{upcomingByDate[dateStr].length} appt{upcomingByDate[dateStr].length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    {/* Appointments for this date */}
                    {upcomingByDate[dateStr].map((apt) => {
                      const pet = aptPets?.find((p) => p.id === apt.petId);
                      const owner = aptOwners?.find((o) => o.id === apt.ownerId);
                      return (
                        <div
                          key={apt.id}
                          className="flex items-center gap-3 p-3 rounded-md bg-muted/40"
                          data-testid={`appointment-row-${apt.id}`}
                        >
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={pet?.imageUrl || ""} alt={pet?.name} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {pet?.name?.charAt(0) || "P"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium truncate">{pet?.name || "Unknown"}</span>
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground leading-none">
                                APT-{apt.id.toString().padStart(4, "0")}
                              </span>
                              <Badge variant={statusColor(apt.status) as any} className="text-[10px]">
                                {apt.status}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {owner?.firstName} {owner?.lastName} &middot; {apt.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-medium">{formatTime12h(apt.time)}</div>
                            </div>
                            {canConsult && (
                              <Button
                                size="sm"
                                variant="default"
                                className="gap-1"
                                onClick={() => handleConsult(apt.petId)}
                                data-testid={`button-consult-${apt.id}`}
                              >
                                <Stethoscope className="w-3.5 h-3.5" />
                                Consult
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Recent Patients
              </CardTitle>
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                {recentPets.length} recent
              </Badge>
            </div>
            <Link href="/patients">
              <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-primary hover:text-primary">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {summaryLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentPets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <PawPrint className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm">No patients registered yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentPets.map((pet) => {
                  const owner = recentOwners?.find((o) => o.id === pet.ownerId);
                  return (
                    <div
                      key={pet.id}
                      className="flex items-center gap-3 p-3 rounded-md bg-muted/40"
                      data-testid={`recent-pet-${pet.id}`}
                    >
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={pet.imageUrl || ""} alt={pet.name} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {pet.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{pet.name}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {pet.species}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {pet.breed} &middot; {[pet.age > 0 ? `${pet.age}y` : "", (pet.ageMonths ?? 0) > 0 ? `${pet.ageMonths}m` : ""].filter(Boolean).join(" ") || "< 1m"} &middot; {owner?.firstName} {owner?.lastName}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{pet.gender}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      <LowStockAlerts />

      <PatientChart
        pet={selectedPet}
        open={chartOpen}
        onOpenChange={setChartOpen}
        owners={recentOwners || []}
        defaultTab="medical-records"
      />
    </div>
  );
}

function LowStockAlerts() {
  const { data: lowStockItems, isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/low-stock"],
  });

  if (isLoading || !lowStockItems || lowStockItems.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Low Stock Alerts
        </CardTitle>
        <Link href="/inventory">
          <Button variant="outline" size="sm" className="text-xs">View Inventory</Button>
        </Link>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="flex flex-col gap-2">
          {lowStockItems.slice(0, 8).map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-md bg-background/60 border border-amber-500/20">
              <Package className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.sku}</span>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-sm font-bold ${item.quantity <= 0 ? "text-red-600" : "text-amber-600"}`}>
                  {item.quantity}
                </span>
                <span className="text-xs text-muted-foreground block">min: {item.minQuantity}</span>
              </div>
            </div>
          ))}
          {lowStockItems.length > 8 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{lowStockItems.length - 8} more items below minimum stock
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
