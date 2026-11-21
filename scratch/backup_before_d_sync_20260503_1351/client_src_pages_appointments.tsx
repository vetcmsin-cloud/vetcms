import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Search,
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  List,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isBefore, startOfToday, parseISO } from "date-fns";
import type { Appointment, Pet, Owner } from "@shared/schema";
import { AddAppointmentDialog } from "@/components/add-appointment-dialog";
import { EditAppointmentDialog } from "@/components/edit-appointment-dialog";
import { FaWhatsapp } from "react-icons/fa";
import { formatWhatsAppLink } from "@/lib/utils";

function statusVariant(status: string) {
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

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-3.5 h-3.5 text-chart-2" />;
    case "cancelled":
      return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    case "in-progress":
      return <AlertCircle className="w-3.5 h-3.5 text-chart-5" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-primary" />;
  }
}

export default function Appointments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: appointments, isLoading } = useQuery<Appointment[]>({ queryKey: ["/api/appointments"] });
  const { data: pets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });
  const { data: owners } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });
  const { toast } = useToast();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Status updated" });
    },
  });

  const filtered = appointments
    ?.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!search) return true;
      const pet = pets?.find((p) => p.id === a.petId);
      const owner = owners?.find((o) => o.id === a.ownerId);
      const searchLower = search.toLowerCase();
      return (
        pet?.name.toLowerCase().includes(searchLower) ||
        (owner?.firstName || "").toLowerCase().includes(searchLower) ||
        (owner?.lastName || "").toLowerCase().includes(searchLower) ||
        a.type.toLowerCase().includes(searchLower) ||
        `APT-${a.id.toString().padStart(4, "0")}`.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-appointments">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Schedule and manage all clinic appointments.
          </p>
        </div>
        <AddAppointmentDialog pets={pets || []} owners={owners || []} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search appointments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-appointments"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Calendar View
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0">
          {isLoading ? (
            <Card>
              <CardContent className="p-0">
                <div className="flex flex-col gap-0">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                      <Skeleton className="w-9 h-9 rounded-full" />
                      <div className="flex flex-col gap-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : filtered && filtered.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <AppointmentList filtered={filtered} pets={pets} owners={owners} updateStatusMutation={updateStatusMutation} />
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No appointments found</p>
              <p className="text-xs mt-1">Schedule a new appointment to get started.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <CalendarView appointments={appointments || []} pets={pets || []} owners={owners || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AppointmentList({ filtered, pets, owners, updateStatusMutation }: any) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">ID</TableHead>
          <TableHead>Patient</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Date & Time</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((apt: any) => {
          const pet = pets?.find((p: any) => p.id === apt.petId);
          const owner = owners?.find((o: any) => o.id === apt.ownerId);
          return (
            <TableRow key={apt.id} data-testid={`row-appointment-${apt.id}`}>
              <TableCell className="font-mono text-xs font-medium text-muted-foreground whitespace-nowrap">
                APT-{apt.id.toString().padStart(4, "0")}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={pet?.imageUrl || ""} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {pet?.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{pet?.name || "Unknown"}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {pet?.species}
                      {pet?.breed ? ` - ${pet.breed}` : ""}
                      {(pet?.age ?? 0) > 0 ? ` | ${pet?.age} Yrs` : ""}
                      {(pet?.ageMonths ?? 0) > 0 ? ` ${pet?.ageMonths} Mo` : ""}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm">
                  {owner ? `${owner.firstName} ${owner.lastName}` : "Unknown"}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm">{apt.date}</span>
                  <span className="text-[11px] text-muted-foreground">{apt.time}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {apt.type}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <StatusIcon status={apt.status} />
                  <Badge variant={statusVariant(apt.status) as any} className="text-[10px]">
                    {apt.status}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <EditAppointmentDialog appointment={apt} pets={pets || []} owners={owners || []} />
                  {owner?.phone && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => {
                        const message = `Hello ${owner.firstName}, this is a confirmation for ${pet?.name || 'your pet'}'s appointment for ${apt.type} on ${apt.date} at ${apt.time}. See you then!`;
                        window.open(formatWhatsAppLink(owner.phone, message), '_blank');
                      }}
                      title="Send WhatsApp Confirmation"
                    >
                      <FaWhatsapp className="w-4 h-4" />
                    </Button>
                  )}
                  {apt.status === "scheduled" && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "completed" })}
                        data-testid={`button-complete-${apt.id}`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "cancelled" })}
                        data-testid={`button-cancel-${apt.id}`}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function CalendarView({ appointments, pets, owners }: { appointments: Appointment[]; pets: Pet[]; owners: Owner[] }) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : "";
  const dayAppointments = appointments.filter(a => a.date === selectedDateStr);
  const isPastDate = date ? isBefore(date, startOfToday()) : false;

  // Identify dates with appointments for highlighting
  const datesWithAppointments = appointments
    .map(a => {
      try {
        const d = parseISO(a.date);
        return isNaN(d.getTime()) ? null : d;
      } catch (e) {
        return null;
      }
    })
    .filter((d): d is Date => d !== null);

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex flex-col gap-4">
        <Card className="w-fit">
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border shadow"
              modifiers={{
                hasAppointment: datesWithAppointments
              }}
              modifiersClassNames={{
                hasAppointment: "bg-primary/10 font-bold text-primary"
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {date ? format(date, "MMMM d, yyyy") : "Select a date"}
          </h3>
          {date && !isPastDate && (
            <AddAppointmentDialog pets={pets} owners={owners} defaultDate={date} />
          )}
        </div>

        {dayAppointments.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {dayAppointments.map(apt => {
              const pet = pets.find(p => p.id === apt.petId);
              const owner = owners.find(o => o.id === apt.ownerId);
              return (
                <Card key={apt.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center w-12 h-12 bg-muted rounded-md px-1">
                        <span className="text-xs font-bold">{apt.time}</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{pet?.name || "Unknown"}</span>
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                            APT-{apt.id.toString().padStart(4, "0")}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{apt.type} - {owner?.firstName} {owner?.lastName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant(apt.status) as any}>{apt.status}</Badge>
                      {owner?.phone && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => {
                            const message = `Hello ${owner.firstName}, this is a reminder for ${pet?.name || 'your pet'}'s appointment for ${apt.type} on ${apt.date} at ${apt.time}. See you then!`;
                            window.open(formatWhatsAppLink(owner.phone, message), '_blank');
                          }}
                          title="Send WhatsApp Confirmation"
                        >
                          <FaWhatsapp className="w-4 h-4" />
                        </Button>
                      )}
                      <EditAppointmentDialog appointment={apt} pets={pets} owners={owners} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-md border-dashed">
            <CalendarDays className="w-10 h-10 mb-2 opacity-20" />
            <p>No appointments for this day</p>
          </div>
        )}
      </div>
    </div>
  );
}
