import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PatientChart } from "@/components/patient-chart";
import { CameraCapture } from "@/components/camera-capture";
import { FullscreenImage } from "@/components/fullscreen-image";
import { Plus, Search, PawPrint, Weight, Calendar, Camera } from "lucide-react";
import type { Pet, Owner } from "@shared/schema";

function AddPetDialog({ open, onOpenChange }: { open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const { toast } = useToast();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const defaultForm = {
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
  const [form, setForm] = useState(defaultForm);

  const handleCameraCapture = (file: File) => {
    setCapturedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const ownerRes = await apiRequest("POST", "/api/owners", {
        firstName: form.ownerFirstName,
        lastName: form.ownerLastName,
        phone: form.ownerPhone,
        email: form.ownerEmail,
        address: form.ownerAddress || undefined,
      });
      const owner = await ownerRes.json();
      const petRes = await apiRequest("POST", "/api/pets", {
        name: form.name,
        species: form.species,
        breed: form.breed,
        age: parseInt(form.age),
        weight: form.weight || undefined,
        gender: form.gender,
        color: form.color || undefined,
        microchip: form.microchip || undefined,
        ownerId: owner.id,
        imageUrl: form.imageUrl || undefined,
      });
      const pet = await petRes.json();
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
      return pet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      setIsOpen(false);
      setForm(defaultForm);
      setPhotoPreview(null);
      setCapturedFile(null);
      toast({ title: "Patient added", description: "New patient and owner have been registered successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = form.name && form.breed && form.age && form.ownerFirstName && form.ownerLastName && form.ownerPhone && form.ownerEmail;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {open === undefined && (
        <DialogTrigger asChild>
          <Button data-testid="button-add-pet">
            <Plus className="w-4 h-4 mr-1" />
            Add Patient
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register New Patient</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="w-20 h-20">
                {photoPreview ? (
                  <AvatarImage src={photoPreview} alt="Preview" />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                    {form.name ? form.name.charAt(0).toUpperCase() : "?"}
                  </AvatarFallback>
                )}
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full"
                onClick={() => setCameraOpen(true)}
                type="button"
                data-testid="button-camera-add-pet"
              >
                <Camera className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {photoPreview ? "Photo captured" : "Take a photo"}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pet-name">Pet Name</Label>
            <Input
              id="pet-name"
              placeholder="Enter pet name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="input-pet-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Species</Label>
              <Select value={form.species} onValueChange={(v) => setForm({ ...form, species: v })}>
                <SelectTrigger data-testid="select-species">
                  <SelectValue />
                </SelectTrigger>
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
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger data-testid="select-gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pet-breed">Breed</Label>
            <Input
              id="pet-breed"
              placeholder="Enter breed"
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
              data-testid="input-pet-breed"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pet-age">Age (years)</Label>
              <Input
                id="pet-age"
                type="number"
                placeholder="Age"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                data-testid="input-pet-age"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pet-weight">Weight (kg)</Label>
              <Input
                id="pet-weight"
                type="number"
                step="0.1"
                placeholder="Weight"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                data-testid="input-pet-weight"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pet-color">Color</Label>
              <Input
                id="pet-color"
                placeholder="Color (optional)"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                data-testid="input-pet-color"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pet-microchip">Microchip</Label>
              <Input
                id="pet-microchip"
                placeholder="Microchip ID (optional)"
                value={form.microchip}
                onChange={(e) => setForm({ ...form, microchip: e.target.value })}
                data-testid="input-pet-microchip"
              />
            </div>
          </div>
          <div className="border-t pt-4 mt-1">
            <p className="text-sm font-medium mb-3">Owner Information</p>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="owner-first-name">First Name</Label>
                  <Input
                    id="owner-first-name"
                    placeholder="First name"
                    value={form.ownerFirstName}
                    onChange={(e) => setForm({ ...form, ownerFirstName: e.target.value })}
                    data-testid="input-owner-first-name"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="owner-last-name">Last Name</Label>
                  <Input
                    id="owner-last-name"
                    placeholder="Last name"
                    value={form.ownerLastName}
                    onChange={(e) => setForm({ ...form, ownerLastName: e.target.value })}
                    data-testid="input-owner-last-name"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="owner-phone">Phone</Label>
                <Input
                  id="owner-phone"
                  placeholder="Phone number"
                  value={form.ownerPhone}
                  onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })}
                  data-testid="input-owner-phone"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="owner-email">Email</Label>
                <Input
                  id="owner-email"
                  type="email"
                  placeholder="Email address"
                  value={form.ownerEmail}
                  onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  data-testid="input-owner-email"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="owner-address">Address (optional)</Label>
                <Input
                  id="owner-address"
                  placeholder="Address"
                  value={form.ownerAddress}
                  onChange={(e) => setForm({ ...form, ownerAddress: e.target.value })}
                  data-testid="input-owner-address"
                />
              </div>
            </div>
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !canSubmit}
            data-testid="button-submit-pet"
          >
            {mutation.isPending ? "Adding..." : "Register Patient"}
          </Button>
        </div>
      </DialogContent>
      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handleCameraCapture}
      />
    </Dialog>
  );
}

function EditPetDialog({ pet, owners, open, onOpenChange }: { pet: Pet; owners: Owner[]; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    age: String(pet.age),
    weight: pet.weight || "",
    gender: pet.gender,
    color: pet.color || "",
    microchip: pet.microchip || "",
    ownerId: String(pet.ownerId),
    imageUrl: pet.imageUrl || "",
  });

  const handleCameraCapture = (file: File) => {
    setCapturedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/pets/${pet.id}`, {
        ...form,
        age: parseInt(form.age),
        weight: form.weight || undefined,
        color: form.color || undefined,
        microchip: form.microchip || undefined,
        ownerId: parseInt(form.ownerId),
      });
      const updated = await res.json();
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
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      onOpenChange(false);
      setPhotoPreview(null);
      setCapturedFile(null);
      toast({ title: "Patient updated", description: "Patient information has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Patient</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar className="w-20 h-20">
                {photoPreview ? (
                  <AvatarImage src={photoPreview} alt="Preview" />
                ) : (
                  <AvatarImage src={pet.imageUrl || ""} alt={pet.name} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                  {pet.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full"
                onClick={() => setCameraOpen(true)}
                type="button"
                data-testid="button-camera-edit-pet"
              >
                <Camera className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {photoPreview ? "New photo captured" : "Take a photo to update"}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-pet-name">Pet Name</Label>
            <Input
              id="edit-pet-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="input-edit-pet-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Species</Label>
              <Select value={form.species} onValueChange={(v) => setForm({ ...form, species: v })}>
                <SelectTrigger data-testid="select-edit-species">
                  <SelectValue />
                </SelectTrigger>
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
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger data-testid="select-edit-gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-pet-breed">Breed</Label>
            <Input
              id="edit-pet-breed"
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
              data-testid="input-edit-pet-breed"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-pet-age">Age (years)</Label>
              <Input
                id="edit-pet-age"
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                data-testid="input-edit-pet-age"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-pet-weight">Weight (kg)</Label>
              <Input
                id="edit-pet-weight"
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                data-testid="input-edit-pet-weight"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-pet-color">Color</Label>
              <Input
                id="edit-pet-color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                data-testid="input-edit-pet-color"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-pet-microchip">Microchip</Label>
              <Input
                id="edit-pet-microchip"
                value={form.microchip}
                onChange={(e) => setForm({ ...form, microchip: e.target.value })}
                data-testid="input-edit-pet-microchip"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Owner</Label>
            <Select value={form.ownerId} onValueChange={(v) => setForm({ ...form, ownerId: v })}>
              <SelectTrigger data-testid="select-edit-owner">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {owners.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.firstName} {o.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || !form.breed || !form.age || !form.ownerId}
            data-testid="button-submit-edit-pet"
          >
            {mutation.isPending ? "Saving..." : "Update Patient"}
          </Button>
        </div>
      </DialogContent>
      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handleCameraCapture}
      />
    </Dialog>
  );
}

function BookAppointmentDialog({ pet, owners, open, onOpenChange }: { pet: Pet; owners: Owner[]; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const owner = owners.find((o) => o.id === pet.ownerId);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    type: "Checkup",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/appointments", {
        petId: pet.id,
        ownerId: pet.ownerId,
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
      onOpenChange(false);
      setForm({ date: new Date().toISOString().split("T")[0], time: "09:00", type: "Checkup", notes: "" });
      toast({ title: "Appointment booked", description: `Appointment scheduled for ${pet.name}.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book Appointment for {pet.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          {owner && (
            <div className="text-sm text-muted-foreground">
              Owner: {owner.firstName} {owner.lastName}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appt-date">Date</Label>
              <Input
                id="appt-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                data-testid="input-appt-date"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appt-time">Time</Label>
              <Input
                id="appt-time"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                data-testid="input-appt-time"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger data-testid="select-appt-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Checkup">Checkup</SelectItem>
                <SelectItem value="Vaccination">Vaccination</SelectItem>
                <SelectItem value="Surgery">Surgery</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
                <SelectItem value="Follow-up">Follow-up</SelectItem>
                <SelectItem value="Grooming">Grooming</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appt-notes">Notes (optional)</Label>
            <Textarea
              id="appt-notes"
              placeholder="Additional notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="resize-none"
              data-testid="input-appt-notes"
            />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.date || !form.time}
            data-testid="button-submit-appointment"
          >
            {mutation.isPending ? "Booking..." : "Book Appointment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Patients() {
  const [search, setSearch] = useState("");
  const { data: pets, isLoading } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });
  const { data: owners } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });

  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [editPet, setEditPet] = useState<Pet | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [bookPet, setBookPet] = useState<Pet | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [fullscreenPet, setFullscreenPet] = useState<Pet | null>(null);

  const filteredPets = pets?.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.breed.toLowerCase().includes(search.toLowerCase()) ||
      p.species.toLowerCase().includes(search.toLowerCase())
  );

  const handlePetClick = (pet: Pet) => {
    setSelectedPet(pet);
    setChartOpen(true);
  };

  const handleEditPet = (pet: Pet) => {
    setChartOpen(false);
    setEditPet(pet);
    setEditOpen(true);
  };

  const handleBookAppointment = (pet: Pet) => {
    setChartOpen(false);
    setBookPet(pet);
    setBookOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-patients">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">
            Manage all registered pets and their information.
          </p>
        </div>
        <AddPetDialog />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-patients"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPets && filteredPets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPets.map((pet) => {
            const owner = owners?.find((o) => o.id === pet.ownerId);
            return (
              <Card
                key={pet.id}
                className="cursor-pointer hover-elevate"
                data-testid={`card-pet-${pet.id}`}
                onClick={() => handlePetClick(pet)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar
                      className="w-12 h-12 cursor-pointer"
                      onClick={(e) => {
                        if (pet.imageUrl) {
                          e.stopPropagation();
                          setFullscreenPet(pet);
                        }
                      }}
                      data-testid={`avatar-pet-${pet.id}`}
                    >
                      <AvatarImage src={pet.imageUrl || ""} alt={pet.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {pet.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{pet.name}</span>
                        <Badge variant="secondary" className="text-[10px]">{pet.species}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{pet.breed}</span>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {pet.age}y
                        </div>
                        {pet.weight && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Weight className="w-3 h-3" />
                            {pet.weight}kg
                          </div>
                        )}
                        <Badge variant="outline" className="text-[10px]">{pet.gender}</Badge>
                      </div>
                      {owner && (
                        <span className="text-[11px] text-muted-foreground mt-1">
                          Owner: {owner.firstName} {owner.lastName}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <PawPrint className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No patients found</p>
          <p className="text-xs mt-1">Add a new patient to get started.</p>
        </div>
      )}

      <PatientChart
        pet={selectedPet}
        open={chartOpen}
        onOpenChange={setChartOpen}
        owners={owners || []}
        onEditPet={handleEditPet}
        onBookAppointment={handleBookAppointment}
      />

      {editPet && (
        <EditPetDialog
          pet={editPet}
          owners={owners || []}
          open={editOpen}
          onOpenChange={(v) => {
            setEditOpen(v);
            if (!v) setEditPet(null);
          }}
        />
      )}

      {bookPet && (
        <BookAppointmentDialog
          pet={bookPet}
          owners={owners || []}
          open={bookOpen}
          onOpenChange={(v) => {
            setBookOpen(v);
            if (!v) setBookPet(null);
          }}
        />
      )}

      <FullscreenImage
        src={fullscreenPet?.imageUrl || ""}
        alt={fullscreenPet?.name || ""}
        open={!!fullscreenPet}
        onClose={() => setFullscreenPet(null)}
      />
    </div>
  );
}
