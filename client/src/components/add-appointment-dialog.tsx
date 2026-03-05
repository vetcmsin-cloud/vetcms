import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CameraCapture } from "@/components/camera-capture";
import { Plus, Search, Camera, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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

    // Camera / photo state
    const [cameraOpen, setCameraOpen] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [capturedFile, setCapturedFile] = useState<File | null>(null);

    // Existing-owner toggle for the register form
    const [useExistingOwner, setUseExistingOwner] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
    const [comboboxOpen, setComboboxOpen] = useState(false);

    // Fetch owners for the combobox (only when needed)
    const { data: allOwners } = useQuery<Owner[]>({
        queryKey: ["/api/owners"],
        enabled: useExistingOwner && showRegister,
    });

    // Format default date to YYYY-MM-DD
    const initialDate = defaultDate ? format(defaultDate, "yyyy-MM-dd") : getCurrentDate();

    const [form, setForm] = useState({
        date: initialDate,
        time: getCurrentTime(),
        type: "Check-up",
        notes: "",
    });

    const defaultNewPatient = {
        name: "",
        species: "Dog",
        breed: "",
        age: "",
        weight: "",
        gender: "Male",
        color: "",
        microchip: "",
        imageUrl: "",
        ownerFirstName: "",
        ownerLastName: "",
        ownerPhone: "",
        ownerEmail: "",
        ownerAddress: "",
    };
    const [newPatient, setNewPatient] = useState(defaultNewPatient);

    const handleCameraCapture = (file: File) => {
        setCapturedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setPhotoPreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const resetDialog = () => {
        setPatientSearch("");
        setSelectedPetId(null);
        setShowRegister(false);
        setForm({ date: initialDate, time: getCurrentTime(), type: "Check-up", notes: "" });
        setNewPatient(defaultNewPatient);
        setPhotoPreview(null);
        setCapturedFile(null);
        setUseExistingOwner(false);
        setSelectedOwner(null);
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
    const selectedOwnerForExisting = selectedPet ? owners.find((o) => o.id === selectedPet.ownerId) : undefined;

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
            let ownerId: number;

            if (useExistingOwner && selectedOwner) {
                ownerId = selectedOwner.id;
            } else {
                const ownerRes = await apiRequest("POST", "/api/owners", {
                    firstName: newPatient.ownerFirstName,
                    lastName: newPatient.ownerLastName,
                    phone: newPatient.ownerPhone,
                    email: newPatient.ownerEmail || undefined,
                    address: newPatient.ownerAddress || undefined,
                });
                const owner = await ownerRes.json();
                ownerId = owner.id;
            }

            const petRes = await apiRequest("POST", "/api/pets", {
                name: newPatient.name,
                species: newPatient.species,
                breed: newPatient.breed || undefined,
                age: parseInt(newPatient.age),
                weight: newPatient.weight || undefined,
                gender: newPatient.gender,
                color: newPatient.color || undefined,
                microchip: newPatient.microchip || undefined,
                ownerId,
                imageUrl: newPatient.imageUrl || undefined,
            });
            const pet = await petRes.json();

            // Upload photo if captured
            if (capturedFile) {
                const formData = new FormData();
                formData.append("file", capturedFile);
                formData.append("petId", String(pet.id));
                await fetch("/api/upload/patient-photo", {
                    method: "POST",
                    body: formData,
                    credentials: "include",
                });
            }

            const aptRes = await apiRequest("POST", "/api/appointments", {
                petId: pet.id,
                ownerId,
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
    const canSubmitNew =
        showRegister &&
        newPatient.name &&
        newPatient.age &&
        form.date &&
        form.time &&
        (
            (useExistingOwner && selectedOwner) ||
            (!useExistingOwner && newPatient.ownerFirstName && newPatient.ownerPhone)
        );
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
                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="apt-date">Date</Label>
                            <Input
                                id="apt-date"
                                type="date"
                                min={getCurrentDate()}
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

                    {/* --- Find Patient (search existing) --- */}
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
                            {/* Also allow registering without searching first */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-1"
                                onClick={() => setShowRegister(true)}
                                data-testid="button-register-new-patient-direct"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Register New Patient
                            </Button>
                        </div>
                    )}

                    {/* --- Selected existing pet chip --- */}
                    {selectedPet && (
                        <div className="flex flex-col gap-1.5">
                            <Label>Patient</Label>
                            <div className="flex items-center justify-between gap-2 border rounded-md px-3 py-2">
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium">{selectedPet.name} ({selectedPet.species})</span>
                                    <span className="text-xs text-muted-foreground">
                                        {selectedPet.breed}
                                        {selectedOwnerForExisting && ` - Owner: ${selectedOwnerForExisting.firstName} ${selectedOwnerForExisting.lastName}`}
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

                    {/* --- Register New Patient (full form, same as Add Patient page) --- */}
                    {showRegister && (
                        <div className="flex flex-col gap-3 border rounded-md p-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">Register New Patient</p>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setShowRegister(false);
                                        setNewPatient(defaultNewPatient);
                                        setPhotoPreview(null);
                                        setCapturedFile(null);
                                        setUseExistingOwner(false);
                                        setSelectedOwner(null);
                                    }}
                                    data-testid="button-cancel-register"
                                >
                                    Back to search
                                </Button>
                            </div>

                            {/* Photo capture */}
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative">
                                    <Avatar className="w-16 h-16">
                                        {photoPreview ? (
                                            <AvatarImage src={photoPreview} alt="Preview" />
                                        ) : (
                                            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                                                {newPatient.name ? newPatient.name.charAt(0).toUpperCase() : "?"}
                                            </AvatarFallback>
                                        )}
                                    </Avatar>
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full"
                                        onClick={() => setCameraOpen(true)}
                                        type="button"
                                        data-testid="button-camera-new-pet"
                                    >
                                        <Camera className="w-3 h-3" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {photoPreview ? "Photo captured" : "Take a photo (optional)"}
                                </p>
                            </div>

                            {/* Pet Name */}
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="new-pet-name">Pet Name *</Label>
                                <Input
                                    id="new-pet-name"
                                    placeholder="Enter pet name"
                                    value={newPatient.name}
                                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                                    data-testid="input-new-pet-name"
                                />
                            </div>

                            {/* Species & Gender */}
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

                            {/* Breed */}
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="new-pet-breed">Breed</Label>
                                <Input
                                    id="new-pet-breed"
                                    placeholder="Enter breed (optional)"
                                    value={newPatient.breed}
                                    onChange={(e) => setNewPatient({ ...newPatient, breed: e.target.value })}
                                    data-testid="input-new-pet-breed"
                                />
                            </div>

                            {/* Age & Weight */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="new-pet-age">Age (years) *</Label>
                                    <Input
                                        id="new-pet-age"
                                        type="number"
                                        placeholder="Age"
                                        value={newPatient.age}
                                        onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                                        data-testid="input-new-pet-age"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="new-pet-weight">Weight (kg)</Label>
                                    <Input
                                        id="new-pet-weight"
                                        type="number"
                                        step="0.1"
                                        placeholder="Weight"
                                        value={newPatient.weight}
                                        onChange={(e) => setNewPatient({ ...newPatient, weight: e.target.value })}
                                        data-testid="input-new-pet-weight"
                                    />
                                </div>
                            </div>

                            {/* Color & Microchip */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="new-pet-color">Color</Label>
                                    <Input
                                        id="new-pet-color"
                                        placeholder="Color (optional)"
                                        value={newPatient.color}
                                        onChange={(e) => setNewPatient({ ...newPatient, color: e.target.value })}
                                        data-testid="input-new-pet-color"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="new-pet-microchip">Microchip</Label>
                                    <Input
                                        id="new-pet-microchip"
                                        placeholder="Microchip ID (optional)"
                                        value={newPatient.microchip}
                                        onChange={(e) => setNewPatient({ ...newPatient, microchip: e.target.value })}
                                        data-testid="input-new-pet-microchip"
                                    />
                                </div>
                            </div>

                            {/* Owner Information */}
                            <div className="border-t pt-3 mt-1">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-medium">Owner Information</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setUseExistingOwner(!useExistingOwner);
                                            setSelectedOwner(null);
                                        }}
                                        className="h-8 text-xs"
                                    >
                                        {useExistingOwner ? "Create New Owner" : "Select Existing Owner"}
                                    </Button>
                                </div>

                                {useExistingOwner ? (
                                    <div className="flex flex-col gap-1.5">
                                        <Label>Search Owner</Label>
                                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={comboboxOpen}
                                                    className="w-full justify-between"
                                                >
                                                    {selectedOwner
                                                        ? `${selectedOwner.firstName} ${selectedOwner.lastName} (${selectedOwner.phone})`
                                                        : "Select owner..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[380px] p-0" align="start">
                                                <Command filter={(value, search) => {
                                                    if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                                                    return 0;
                                                }}>
                                                    <CommandInput placeholder="Search by name or phone..." />
                                                    <CommandList>
                                                        <CommandEmpty>No owner found.</CommandEmpty>
                                                        <CommandGroup>
                                                            <ScrollArea className="h-[180px]">
                                                                {allOwners?.map((owner) => (
                                                                    <CommandItem
                                                                        key={owner.id}
                                                                        value={`${owner.firstName} ${owner.lastName} ${owner.phone}`}
                                                                        onSelect={() => {
                                                                            setSelectedOwner(owner);
                                                                            setComboboxOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                selectedOwner?.id === owner.id ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium">{owner.firstName} {owner.lastName}</span>
                                                                            <span className="text-xs text-muted-foreground">{owner.phone}</span>
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                            </ScrollArea>
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {selectedOwner && (
                                            <div className="p-3 bg-muted/40 rounded-md mt-2 text-sm">
                                                <p><span className="font-medium">Selected:</span> {selectedOwner.firstName} {selectedOwner.lastName}</p>
                                                <p><span className="text-muted-foreground">Phone:</span> {selectedOwner.phone}</p>
                                                <p><span className="text-muted-foreground">Email:</span> {selectedOwner.email || "N/A"}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1.5">
                                                <Label htmlFor="new-owner-fname">First Name *</Label>
                                                <Input
                                                    id="new-owner-fname"
                                                    placeholder="First name"
                                                    value={newPatient.ownerFirstName}
                                                    onChange={(e) => setNewPatient({ ...newPatient, ownerFirstName: e.target.value })}
                                                    data-testid="input-new-owner-first-name"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <Label htmlFor="new-owner-lname">Last Name <span className="text-xs text-muted-foreground">(optional)</span></Label>
                                                <Input
                                                    id="new-owner-lname"
                                                    placeholder="Last name (optional)"
                                                    value={newPatient.ownerLastName}
                                                    onChange={(e) => setNewPatient({ ...newPatient, ownerLastName: e.target.value })}
                                                    data-testid="input-new-owner-last-name"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="new-owner-phone">Phone *</Label>
                                            <Input
                                                id="new-owner-phone"
                                                placeholder="Phone number"
                                                value={newPatient.ownerPhone}
                                                onChange={(e) => setNewPatient({ ...newPatient, ownerPhone: e.target.value })}
                                                data-testid="input-new-owner-phone"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="new-owner-email">Email (optional)</Label>
                                            <Input
                                                id="new-owner-email"
                                                type="email"
                                                placeholder="Email address"
                                                value={newPatient.ownerEmail}
                                                onChange={(e) => setNewPatient({ ...newPatient, ownerEmail: e.target.value })}
                                                data-testid="input-new-owner-email"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="new-owner-address">Address (optional)</Label>
                                            <Input
                                                id="new-owner-address"
                                                placeholder="Address"
                                                value={newPatient.ownerAddress}
                                                onChange={(e) => setNewPatient({ ...newPatient, ownerAddress: e.target.value })}
                                                data-testid="input-new-owner-address"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Appointment Type */}
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

                    {/* Notes */}
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

                    {/* Submit */}
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

            {/* Camera capture modal */}
            <CameraCapture
                open={cameraOpen}
                onOpenChange={setCameraOpen}
                onCapture={handleCameraCapture}
            />
        </Dialog>
    );
}
