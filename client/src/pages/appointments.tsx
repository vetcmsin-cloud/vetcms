import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  Plus,
  Search,
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { Appointment, Pet, Owner } from "@shared/schema";

const appointmentTypes = [
  "Check-up",
  "Vaccination",
  "Surgery",
  "Dental",
  "Emergency",
  "Grooming",
  "Follow-up",
  "X-Ray",
  "Lab Work",
];

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

function getCurrentDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function AddAppointmentDialog({ pets, owners }: { pets: Pet[]; owners: Owner[] }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({
    date: getCurrentDate(),
    time: getCurrentTime(),
    type: "Check-up",
    notes: "",
  });
  const [newPatient, setNewPatient] = useState({
    name: "",
    species: "Dog",
    breed: "",
    age: "",
    weight: "",
    gender: "Male",
    color: "",
    microchip: "",
    ownerFirstName: "",
    ownerLastName: "",
    ownerPhone: "",
    ownerEmail: "",
    ownerAddress: "",
  });

  const resetDialog = () => {
    setPatientSearch("");
    setSelectedPetId(null);
    setShowRegister(false);
    setForm({ date: getCurrentDate(), time: getCurrentTime(), type: "Check-up", notes: "" });
    setNewPatient({ name: "", species: "Dog", breed: "", age: "", weight: "", gender: "Male", color: "", microchip: "", ownerFirstName: "", ownerLastName: "", ownerPhone: "", ownerEmail: "", ownerAddress: "" });
  };

  const searchResults = patientSearch.trim().length >= 2
    ? pets.filter((p) => {
        const q = patientSearch.toLowerCase();
        const owner = owners.find((o) => o.id === p.ownerId);
        return (
          p.name.toLowerCase().includes(q) ||
          (owner?.phone && owner.phone.includes(patientSearch.trim()))
        );
      }).slice(0, 8)
    : [];

  const selectedPet = pets.find((p) => p.id === selectedPetId);
  const selectedOwner = selectedPet ? owners.find((o) => o.id === selectedPet.ownerId) : undefined;

  const appointmentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/appointments", {
        petId: selectedPetId,
        ownerId: selectedPet!.ownerId,
        date: form.date,
        time: form.time,
        type: form.type,
        status: "scheduled",
        notes: form.notes || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setOpen(false);
      resetDialog();
      toast({ title: "Appointment created", description: "New appointment has been scheduled." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const registerAndBookMutation = useMutation({
    mutationFn: async () => {
      const ownerRes = await apiRequest("POST", "/api/owners", {
        firstName: newPatient.ownerFirstName,
        lastName: newPatient.ownerLastName,
        phone: newPatient.ownerPhone,
        email: newPatient.ownerEmail,
        address: newPatient.ownerAddress || undefined,
      });
      const owner = await ownerRes.json();
      const petRes = await apiRequest("POST", "/api/pets", {
        name: newPatient.name,
        species: newPatient.species,
        breed: newPatient.breed,
        age: parseInt(newPatient.age),
        weight: newPatient.weight || undefined,
        gender: newPatient.gender,
        color: newPatient.color || undefined,
        microchip: newPatient.microchip || undefined,
        ownerId: owner.id,
      });
      const pet = await petRes.json();
      const aptRes = await apiRequest("POST", "/api/appointments", {
        petId: pet.id,
        ownerId: owner.id,
        date: form.date,
        time: form.time,
        type: form.type,
        status: "scheduled",
        notes: form.notes || undefined,
      });
      return aptRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      setOpen(false);
      resetDialog();
      toast({ title: "Appointment created", description: "Patient registered and appointment scheduled." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canSubmitExisting = selectedPetId && form.date && form.time;
  const canSubmitNew = showRegister && newPatient.name && newPatient.breed && newPatient.age && newPatient.ownerFirstName && newPatient.ownerLastName && newPatient.ownerPhone && newPatient.ownerEmail && form.date && form.time;
  const isPending = appointmentMutation.isPending || registerAndBookMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetDialog(); }}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-appointment">
          <Plus className="w-4 h-4 mr-1" />
          New Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apt-date">Date</Label>
              <Input
                id="apt-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                data-testid="input-appointment-date"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apt-time">Time</Label>
              <Input
                id="apt-time"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                data-testid="input-appointment-time"
              />
            </div>
          </div>

          {!selectedPet && !showRegister && (
            <div className="flex flex-col gap-1.5">
              <Label>Find Patient</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by pet name or owner phone..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-patient"
                />
              </div>
              {patientSearch.trim().length >= 2 && (
                <div className="border rounded-md mt-1 max-h-48 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    searchResults.map((p) => {
                      const o = owners.find((ow) => ow.id === p.ownerId);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover-elevate flex items-center justify-between gap-2 border-b last:border-0"
                          onClick={() => {
                            setSelectedPetId(p.id);
                            setPatientSearch("");
                          }}
                          data-testid={`search-result-pet-${p.id}`}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{p.name} ({p.species})</span>
                            <span className="text-xs text-muted-foreground truncate">{p.breed}</span>
                          </div>
                          {o && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {o.firstName} {o.lastName} - {o.phone}
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                      <p>No patients found</p>
                      <Button
                        variant="ghost"
                        className="mt-1 h-auto text-sm text-primary underline"
                        onClick={() => setShowRegister(true)}
                        data-testid="button-register-new-patient"
                      >
                        Register new patient
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedPet && (
            <div className="flex flex-col gap-1.5">
              <Label>Patient</Label>
              <div className="flex items-center justify-between gap-2 border rounded-md px-3 py-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium">{selectedPet.name} ({selectedPet.species})</span>
                  <span className="text-xs text-muted-foreground">
                    {selectedPet.breed}
                    {selectedOwner && ` - Owner: ${selectedOwner.firstName} ${selectedOwner.lastName}`}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPetId(null)}
                  data-testid="button-change-patient"
                >
                  Change
                </Button>
              </div>
            </div>
          )}

          {showRegister && (
            <div className="flex flex-col gap-3 border rounded-md p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Register New Patient</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRegister(false)}
                  data-testid="button-cancel-register"
                >
                  Back to search
                </Button>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-pet-name">Pet Name</Label>
                <Input id="new-pet-name" placeholder="Pet name" value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} data-testid="input-new-pet-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Species</Label>
                  <Select value={newPatient.species} onValueChange={(v) => setNewPatient({ ...newPatient, species: v })}>
                    <SelectTrigger data-testid="select-new-species"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dog">Dog</SelectItem>
                      <SelectItem value="Cat">Cat</SelectItem>
                      <SelectItem value="Bird">Bird</SelectItem>
                      <SelectItem value="Rabbit">Rabbit</SelectItem>
                      <SelectItem value="Hamster">Hamster</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Gender</Label>
                  <Select value={newPatient.gender} onValueChange={(v) => setNewPatient({ ...newPatient, gender: v })}>
                    <SelectTrigger data-testid="select-new-gender"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-pet-breed">Breed</Label>
                <Input id="new-pet-breed" placeholder="Breed" value={newPatient.breed} onChange={(e) => setNewPatient({ ...newPatient, breed: e.target.value })} data-testid="input-new-pet-breed" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-pet-age">Age (years)</Label>
                  <Input id="new-pet-age" type="number" placeholder="Age" value={newPatient.age} onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })} data-testid="input-new-pet-age" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-pet-weight">Weight (kg)</Label>
                  <Input id="new-pet-weight" type="number" step="0.1" placeholder="Weight" value={newPatient.weight} onChange={(e) => setNewPatient({ ...newPatient, weight: e.target.value })} data-testid="input-new-pet-weight" />
                </div>
              </div>
              <div className="border-t pt-3 mt-1">
                <p className="text-sm font-medium mb-2">Owner Information</p>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="new-owner-fname">First Name</Label>
                      <Input id="new-owner-fname" placeholder="First name" value={newPatient.ownerFirstName} onChange={(e) => setNewPatient({ ...newPatient, ownerFirstName: e.target.value })} data-testid="input-new-owner-first-name" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="new-owner-lname">Last Name</Label>
                      <Input id="new-owner-lname" placeholder="Last name" value={newPatient.ownerLastName} onChange={(e) => setNewPatient({ ...newPatient, ownerLastName: e.target.value })} data-testid="input-new-owner-last-name" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-owner-phone">Phone</Label>
                    <Input id="new-owner-phone" placeholder="Phone number" value={newPatient.ownerPhone} onChange={(e) => setNewPatient({ ...newPatient, ownerPhone: e.target.value })} data-testid="input-new-owner-phone" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-owner-email">Email</Label>
                    <Input id="new-owner-email" type="email" placeholder="Email" value={newPatient.ownerEmail} onChange={(e) => setNewPatient({ ...newPatient, ownerEmail: e.target.value })} data-testid="input-new-owner-email" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-owner-address">Address (optional)</Label>
                    <Input id="new-owner-address" placeholder="Address" value={newPatient.ownerAddress} onChange={(e) => setNewPatient({ ...newPatient, ownerAddress: e.target.value })} data-testid="input-new-owner-address" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger data-testid="select-appointment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {appointmentTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apt-notes">Notes</Label>
            <Textarea
              id="apt-notes"
              placeholder="Additional notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              data-testid="input-appointment-notes"
            />
          </div>
          {showRegister ? (
            <Button
              onClick={() => registerAndBookMutation.mutate()}
              disabled={isPending || !canSubmitNew}
              data-testid="button-submit-appointment"
            >
              {isPending ? "Scheduling..." : "Register & Schedule"}
            </Button>
          ) : (
            <Button
              onClick={() => appointmentMutation.mutate()}
              disabled={isPending || !canSubmitExisting}
              data-testid="button-submit-appointment"
            >
              {isPending ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
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
        owner?.firstName.toLowerCase().includes(searchLower) ||
        owner?.lastName.toLowerCase().includes(searchLower) ||
        a.type.toLowerCase().includes(searchLower)
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((apt) => {
                  const pet = pets?.find((p) => p.id === apt.petId);
                  const owner = owners?.find((o) => o.id === apt.ownerId);
                  return (
                    <TableRow key={apt.id} data-testid={`row-appointment-${apt.id}`}>
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
                            <span className="text-[11px] text-muted-foreground">{pet?.species}</span>
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
                        {apt.status === "scheduled" && (
                          <div className="flex items-center justify-end gap-1">
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
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarDays className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No appointments found</p>
          <p className="text-xs mt-1">Schedule a new appointment to get started.</p>
        </div>
      )}
    </div>
  );
}
