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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  Search,
  FileText,
  Stethoscope,
  Pill,
  ClipboardList,
} from "lucide-react";
import type { MedicalRecord, Pet, Owner } from "@shared/schema";

function AddRecordDialog({ pets }: { pets: Pet[] }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({
    petId: "",
    date: new Date().toISOString().split("T")[0],
    diagnosis: "",
    treatment: "",
    prescription: "",
    veterinarian: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/medical-records", {
        ...form,
        petId: parseInt(form.petId),
        prescription: form.prescription || undefined,
        notes: form.notes || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records"] });
      setOpen(false);
      setForm({ petId: "", date: new Date().toISOString().split("T")[0], diagnosis: "", treatment: "", prescription: "", veterinarian: "", notes: "" });
      toast({ title: "Record added", description: "Medical record has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-record">
          <Plus className="w-4 h-4 mr-1" />
          New Record
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Medical Record</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Patient</Label>
              <Select value={form.petId} onValueChange={(v) => setForm({ ...form, petId: v })}>
                <SelectTrigger data-testid="select-record-pet">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} ({p.species})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="record-date">Date</Label>
              <Input
                id="record-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                data-testid="input-record-date"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="record-vet">Veterinarian</Label>
            <Input
              id="record-vet"
              placeholder="Dr. Name"
              value={form.veterinarian}
              onChange={(e) => setForm({ ...form, veterinarian: e.target.value })}
              data-testid="input-record-vet"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="record-diagnosis">Diagnosis</Label>
            <Textarea
              id="record-diagnosis"
              placeholder="Enter diagnosis"
              value={form.diagnosis}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              data-testid="input-record-diagnosis"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="record-treatment">Treatment</Label>
            <Textarea
              id="record-treatment"
              placeholder="Enter treatment details"
              value={form.treatment}
              onChange={(e) => setForm({ ...form, treatment: e.target.value })}
              data-testid="input-record-treatment"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="record-prescription">Prescription</Label>
            <Input
              id="record-prescription"
              placeholder="Medication details (optional)"
              value={form.prescription}
              onChange={(e) => setForm({ ...form, prescription: e.target.value })}
              data-testid="input-record-prescription"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="record-notes">Additional Notes</Label>
            <Textarea
              id="record-notes"
              placeholder="Additional notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              data-testid="input-record-notes"
            />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.petId || !form.diagnosis || !form.treatment || !form.veterinarian}
            data-testid="button-submit-record"
          >
            {mutation.isPending ? "Saving..." : "Save Record"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Records() {
  const [search, setSearch] = useState("");
  const { data: records, isLoading } = useQuery<MedicalRecord[]>({ queryKey: ["/api/medical-records"] });
  const { data: pets } = useQuery<Pet[]>({ queryKey: ["/api/pets"] });
  const { data: owners } = useQuery<Owner[]>({ queryKey: ["/api/owners"] });

  const filteredRecords = records
    ?.filter((r) => {
      if (!search) return true;
      const pet = pets?.find((p) => p.id === r.petId);
      const searchLower = search.toLowerCase();
      return (
        pet?.name.toLowerCase().includes(searchLower) ||
        r.diagnosis.toLowerCase().includes(searchLower) ||
        r.veterinarian.toLowerCase().includes(searchLower) ||
        r.treatment.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-records">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Medical Records</h1>
          <p className="text-sm text-muted-foreground">
            View and manage patient medical history.
          </p>
        </div>
        <AddRecordDialog pets={pets || []} />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-records"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRecords && filteredRecords.length > 0 ? (
        <Accordion type="multiple" className="flex flex-col gap-3">
          {filteredRecords.map((record) => {
            const pet = pets?.find((p) => p.id === record.petId);
            const owner = owners?.find((o) => o.id === pet?.ownerId);
            return (
              <AccordionItem
                key={record.id}
                value={String(record.id)}
                className="border rounded-md overflow-visible"
                data-testid={`record-item-${record.id}`}
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline">
                  <div className="flex items-center gap-3 text-left flex-1">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={pet?.imageUrl || ""} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {pet?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{pet?.name || "Unknown"}</span>
                        <Badge variant="secondary" className="text-[10px]">{record.date}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        {record.diagnosis} &middot; Dr. {record.veterinarian}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  <div className="flex flex-col gap-4 pt-2 border-t">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Stethoscope className="w-3.5 h-3.5" />
                          Diagnosis
                        </div>
                        <p className="text-sm">{record.diagnosis}</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <ClipboardList className="w-3.5 h-3.5" />
                          Treatment
                        </div>
                        <p className="text-sm">{record.treatment}</p>
                      </div>
                    </div>
                    {record.prescription && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Pill className="w-3.5 h-3.5" />
                          Prescription
                        </div>
                        <p className="text-sm">{record.prescription}</p>
                      </div>
                    )}
                    {record.notes && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <FileText className="w-3.5 h-3.5" />
                          Notes
                        </div>
                        <p className="text-sm">{record.notes}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span>Veterinarian: Dr. {record.veterinarian}</span>
                      {owner && <span>Owner: {owner.firstName} {owner.lastName}</span>}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No medical records found</p>
          <p className="text-xs mt-1">Add a new medical record to get started.</p>
        </div>
      )}
    </div>
  );
}
