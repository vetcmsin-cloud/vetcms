import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import type { Pet, Owner, Appointment } from "@shared/schema";

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
  const { data: pets, isLoading: petsLoading } = useQuery<Pet[]>({
    queryKey: ["/api/pets"],
  });
  const { data: owners, isLoading: ownersLoading } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });
  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppointments = appointments?.filter((a) => a.date === todayStr) || [];
  const upcomingAppointments =
    appointments
      ?.filter((a) => a.date >= todayStr && a.status === "scheduled")
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 5) || [];
  const recentPets = pets?.slice(-5).reverse() || [];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-dashboard">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back to PetPoint Pro. Here's your clinic overview.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Patients"
          value={pets?.length ?? 0}
          icon={PawPrint}
          trend="+12% this month"
          loading={petsLoading}
          testId="stat-patients"
        />
        <StatCard
          title="Pet Owners"
          value={owners?.length ?? 0}
          icon={Users}
          trend="+8% this month"
          loading={ownersLoading}
          testId="stat-owners"
        />
        <StatCard
          title="Today's Appointments"
          value={todayAppointments.length}
          icon={CalendarCheck}
          loading={appointmentsLoading}
          testId="stat-today"
        />
        <StatCard
          title="Total Appointments"
          value={appointments?.length ?? 0}
          icon={CalendarDays}
          loading={appointmentsLoading}
          testId="stat-appointments"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Upcoming Appointments
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {upcomingAppointments.length} upcoming
            </Badge>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {appointmentsLoading ? (
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
              <div className="flex flex-col gap-2">
                {upcomingAppointments.map((apt) => {
                  const pet = pets?.find((p) => p.id === apt.petId);
                  const owner = owners?.find((o) => o.id === apt.ownerId);
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
                          <Badge variant={statusColor(apt.status) as any} className="text-[10px]">
                            {apt.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {owner?.firstName} {owner?.lastName} &middot; {apt.type}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-medium">{apt.time}</div>
                        <div className="text-[11px] text-muted-foreground">{apt.date}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Recent Patients
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {recentPets.length} recent
            </Badge>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {petsLoading ? (
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
                  const owner = owners?.find((o) => o.id === pet.ownerId);
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
                          {pet.breed} &middot; {pet.age}y &middot; {owner?.firstName} {owner?.lastName}
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
    </div>
  );
}
