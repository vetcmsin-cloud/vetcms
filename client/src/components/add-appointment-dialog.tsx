import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";
import type { Pet, Owner } from "@shared/schema";

const appointmentTypes = [
    "General Consultation",
    "Check-up",
    "Vaccination",
    "Surgery",
    "Dental",
    "Emergency",
    "Grooming",
    "Follow-up",
    "Laboratory Diagnosis",
    "Imaging",
    "Breeding",
];

function getCurrentDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getCurrentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function AddAppointmentDialog({ pets, owners, defaultDate }: { pets: Pet[]; owners: Owner[]; defaultDate?: Date }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [patientSearch, setPatientSearch] = useState("");
    const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
    const [showRegister, setShowRegister] = useState(false);

    // Format default date to YYYY-MM-DD
    const today = new Date();
    const initialDate = defaultDate ? format(defaultDate, "yyyy-MM-dd") : getCurrentDate();

    const [form, setForm] = useState({
        date: initialDate,
        time: getCurrentTime(),
        type: "Check-up",
        notes: "",
    });

    // Update form date when defaultDate changes or dialog opens (optional, but good for UX)
    // We can use useEffect or just rely on initial state if component remounts or key changes.

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
        setForm({ date: initialDate, time: getCurrentTime(), type: "Check-up", notes: "" });
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
                                min={getCurrentDate()} // Prevent past dates
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
