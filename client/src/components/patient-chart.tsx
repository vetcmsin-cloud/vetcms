import { useState, useMemo, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CameraCapture } from "@/components/camera-capture";
import { FullscreenImage } from "@/components/fullscreen-image";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Pencil,
  Clock,
  Phone,
  Mail,
  MapPin,
  Save,
  Receipt,
  FolderOpen,
  Camera,
  X,
  Check,
} from "lucide-react";
import type { Pet, Owner, Appointment, MedicalRecord } from "@shared/schema";
import { MedicalReportRenderer } from "@/components/document-designer/MedicalReportRenderer";
import { createPortal } from "react-dom";
import { LabReportsTab } from "@/components/lab-reports-tab";
import { DocumentsTab } from "@/components/documents-tab";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function PatientInfoTab({ pet }: { pet: Pet }) {
  return (
    <div className="flex flex-col gap-5 py-4" data-testid="tab-content-patient-info">
      <div className="grid grid-cols-2 gap-y-5 gap-x-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Species</span>
          <span className="text-sm font-semibold" data-testid="text-pet-species">{pet.species}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Breed</span>
          <span className="text-sm font-semibold" data-testid="text-pet-breed">{pet.breed}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Age</span>
          <span className="text-sm font-semibold" data-testid="text-pet-age">{pet.age} year{pet.age !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Weight</span>
          <span className="text-sm font-semibold" data-testid="text-pet-weight">{pet.weight ? `${pet.weight}kg` : "--"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Color</span>
          <span className="text-sm font-semibold" data-testid="text-pet-color">{pet.color || "--"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Microchip</span>
          <span className="text-sm font-semibold" data-testid="text-pet-microchip">{pet.microchip || "Not registered"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Account Created</span>
          <span className="text-sm font-semibold" data-testid="text-pet-created-at">
            {pet.createdAt ? new Date(pet.createdAt).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short"
            }) : "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}

function OwnerTab({ owner }: { owner: Owner | undefined }) {
  if (!owner) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground" data-testid="tab-content-owner">
        Owner information not available.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5 py-4" data-testid="tab-content-owner">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {owner.firstName.charAt(0)}{owner.lastName?.charAt(0) || ''}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold" data-testid="text-owner-name">{owner.firstName} {owner.lastName}</span>
          <span className="text-xs text-muted-foreground">Pet Owner</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm" data-testid="text-owner-phone">{owner.phone}</span>
        </div>
        <div className="flex items-center gap-3">
          <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm" data-testid="text-owner-email">{owner.email}</span>
        </div>
        {owner.address && (
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm" data-testid="text-owner-address">{owner.address}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryTab({ petId }: { petId: number }) {
  const { data: appointments, isLoading } = useQuery<Appointment[]>({ queryKey: ["/api/appointments"] });

  const petAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments
      .filter((a) => a.petId === petId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [appointments, petId]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-4" data-testid="tab-content-history">
      {petAppointments.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No visit history found.
        </div>
      ) : (
        petAppointments.map((appt) => (
          <Card key={appt.id} data-testid={`history-item-${appt.id}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{appt.type}</span>
                  <span className="text-xs text-muted-foreground">{appt.date} at {appt.time}</span>
                </div>
                <Badge
                  variant={appt.status === "completed" ? "default" : appt.status === "cancelled" ? "destructive" : "secondary"}
                  className="text-[10px]"
                >
                  {appt.status}
                </Badge>
              </div>
              {appt.notes && (
                <p className="text-xs text-muted-foreground mt-2">{appt.notes}</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}



function MedicalRecordsTab({ pet, owner }: { pet: Pet; owner: Owner | undefined }) {
  const { toast } = useToast();
  const { user, hasPermission } = useAuth();
  const [, setLocation] = useLocation();

  const { data: records, isLoading: recordsLoading } = useQuery<MedicalRecord[]>({ queryKey: ["/api/medical-records"] });
  const { data: appointments } = useQuery<any[]>({ queryKey: ["/api/appointments"] });

  const petRecords = useMemo(() => {
    if (!records) return [];
    return records
      .filter((r) => r.petId === pet.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, pet.id]);

  const canAddRecords = hasPermission("medical_records.create", "medical_records.manage");
  const canGenerateInvoice = hasPermission("billing.manage", "billing.create");

  const [subjective, setSubjective] = useState("");

  // Structured Assessment fields
  const [diagnosisQuery, setDiagnosisQuery] = useState("");
  const [diagnosisSelected, setDiagnosisSelected] = useState("");
  const [diagnosisShowSuggestions, setDiagnosisShowSuggestions] = useState(false);
  const [assessmentNotes, setAssessmentNotes] = useState("");

  // Serialise assessment for API
  const assessment = [
    diagnosisSelected ? `Diagnosis: ${diagnosisSelected}` : "",
    assessmentNotes ? `Notes: ${assessmentNotes}` : "",
  ].filter(Boolean).join("\n");

  // Structured Plan fields
  const [procedures, setProcedures] = useState("");
  const [medications, setMedications] = useState("");
  const [planInstructions, setPlanInstructions] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);

  // Serialise plan for API
  const plan = [
    procedures ? `Procedures/Tests: ${procedures}` : "",
    medications ? `Medications/Dosage: ${medications}` : "",
    planInstructions ? `Instructions: ${planInstructions}` : "",
  ].filter(Boolean).join("\n");

  // Structured Objective fields
  const [vitals, setVitals] = useState({ temperature: "", pulse: "", heartRate: "", respiratoryRate: "" });
  const [mucousMembranes, setMucousMembranes] = useState("");
  const [lymphNodes, setLymphNodes] = useState("");

  // Serialise structured objective into a string for the API
  const objective = [
    vitals.temperature ? `Temperature: ${vitals.temperature}` : "",
    vitals.pulse ? `Pulse: ${vitals.pulse} bpm` : "",
    vitals.heartRate ? `Heart Rate: ${vitals.heartRate} bpm` : "",
    vitals.respiratoryRate ? `Respiratory Rate: ${vitals.respiratoryRate} brpm` : "",
    mucousMembranes ? `Mucous Membranes: ${mucousMembranes}` : "",
    lymphNodes ? `Lymph Nodes: ${lymphNodes}` : "",
  ].filter(Boolean).join(" | ");

  const resetForm = () => {
    setSubjective("");
    setVitals({ temperature: "", pulse: "", heartRate: "", respiratoryRate: "" });
    setMucousMembranes("");
    setLymphNodes("");
    setDiagnosisQuery("");
    setDiagnosisSelected("");
    setAssessmentNotes("");
    setProcedures("");
    setMedications("");
    setPlanInstructions("");
  };

  // Vet diagnosis search list
  const VET_DIAGNOSES = [
    "Parvovirus", "Distemper", "Kennel Cough (Bordetella)", "Leptospirosis",
    "Canine Influenza", "Rabies exposure", "Ehrlichiosis", "Anaplasmosis",
    "Babesiosis", "Heartworm Disease", "Intestinal Parasites (Roundworm)",
    "Intestinal Parasites (Hookworm)", "Giardia", "Tapeworm Infestation",
    "Skin Allergy (Atopic Dermatitis)", "Flea Allergy Dermatitis",
    "Otitis Externa", "Pyoderma", "Ringworm (Dermatophytosis)",
    "Mange (Sarcoptic / Demodex)", "Gastroenteritis", "Pancreatitis",
    "Hepatitis", "Liver Disease", "Kidney Disease (CKD)",
    "Urinary Tract Infection", "Bladder Stones (Urolithiasis)",
    "Diabetes Mellitus", "Hypothyroidism", "Hyperthyroidism (cats)",
    "Cushing's Disease (Hyperadrenocorticism)",
    "Addison's Disease (Hypoadrenocorticism)",
    "Arthritis / Osteoarthritis", "Hip Dysplasia", "Fracture",
    "Luxating Patella", "Intervertebral Disc Disease (IVDD)",
    "Conjunctivitis", "Cataracts", "Glaucoma", "Dental Disease",
    "Stomatitis", "Upper Respiratory Infection (URI)",
    "Pneumonia", "Asthma (cats)", "Pleural Effusion",
    "Congestive Heart Failure", "Dilated Cardiomyopathy",
    "Hypertrophic Cardiomyopathy (HCM)", "Seizure / Epilepsy",
    "Vestibular Disease", "Toxin Ingestion / Poisoning",
    "Foreign Body Ingestion", "Heat Stroke", "Obesity",
    "Mammary Tumor", "Mast Cell Tumor", "Lymphoma", "Osteosarcoma",
    "Anal Gland Disease", "Perianal Fistula", "Pyometra",
    "Dystocia", "Cryptorchidism", "Prostatic Hyperplasia",
  ];

  const diagnosisSuggestions = diagnosisQuery.trim().length >= 2
    ? VET_DIAGNOSES.filter(d => d.toLowerCase().includes(diagnosisQuery.toLowerCase())).slice(0, 8)
    : [];

  // Treatment plan templates
  const TREATMENT_TEMPLATES: { label: string; procedures: string; medications: string; instructions: string }[] = [
    {
      label: "Dehydration / IV Fluid Therapy",
      procedures: "IV catheter placement, PCV/TS, Blood glucose",
      medications: "LRS IV fluids at 50 ml/hr",
      instructions: "Administer IV fluids; re-evaluate vitals every 4 hours; monitor urine output; rehydrate and reassess.",
    },
    {
      label: "Gastroenteritis",
      procedures: "Faecal exam, Blood panel, Parvo snap test",
      medications: "Metronidazole 15mg/kg BID x 5 days; Cerenia 1mg/kg SQ SID",
      instructions: "Bland diet (boiled chicken & rice) x 3-5 days; small frequent meals; ensure fresh water available.",
    },
    {
      label: "Skin Infection / Pyoderma",
      procedures: "Skin scraping, Cytology",
      medications: "Amoxicillin-Clavulanate 12.5mg/kg BID x 14 days; Chlorhexidine shampoo 2x/week",
      instructions: "Bathe with medicated shampoo twice weekly; apply topical as directed; recheck in 14 days.",
    },
    {
      label: "Otitis Externa",
      procedures: "Ear cytology, Culture if resistant",
      medications: "Otomax ear drops 6 drops per ear BID x 7 days; clean ears with Epi-Otic",
      instructions: "Clean ears before applying drops; recheck in 7-10 days; prevent swimming during treatment.",
    },
    {
      label: "Vaccination Visit",
      procedures: "Physical exam, weight check",
      medications: "Per vaccination protocol",
      instructions: "Observe for 20 mins post-vaccination; watch for allergic reaction; next booster as per schedule.",
    },
    {
      label: "Post-Surgery Recovery",
      procedures: "E-collar fitting, Wound check",
      medications: "Amoxicillin 20mg/kg BID x 7 days; Meloxicam 0.1mg/kg SID x 3 days",
      instructions: "Keep incision dry; restrict activity for 10-14 days; return for suture removal in 10 days; monitor for swelling or discharge.",
    },
  ];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/medical-records", {
        petId: pet.id,
        date: todayStr(),
        diagnosis: assessment,
        treatment: plan,
        prescription: "",
        veterinarian: user?.name || "Unknown",
        notes: `SUBJECTIVE: ${subjective}\nOBJECTIVE: ${objective}`,
      });

      // Mark appointment as 'completed' if exists for today
      if (appointments) {
        const today = todayStr();
        const appointment = appointments.find(a =>
          a.petId === pet.id &&
          (a.status === 'scheduled' || a.status === 'in-progress') &&
          a.date === today
        );

        if (appointment) {
          await apiRequest("PATCH", `/api/appointments/${appointment.id}`, { status: "completed" });
        }
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      resetForm();
      toast({ title: "Record saved", description: "Medical record has been saved successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveAndInvoiceMutation = useMutation({
    mutationFn: async () => {
      const recordRes = await apiRequest("POST", "/api/medical-records", {
        petId: pet.id,
        date: todayStr(),
        diagnosis: assessment,
        treatment: plan,
        prescription: "",
        veterinarian: user?.name || "Unknown",
        notes: `SUBJECTIVE: ${subjective}\nOBJECTIVE: ${objective}`,
      });
      await recordRes.json();

      // Mark appointment as 'completed' if exists for today
      if (appointments) {
        const today = todayStr();
        const appointment = appointments.find(a =>
          a.petId === pet.id &&
          (a.status === 'scheduled' || a.status === 'in-progress') &&
          a.date === today
        );

        if (appointment) {
          await apiRequest("PATCH", `/api/appointments/${appointment.id}`, { status: "completed" });
        }
      }

      if (owner && canGenerateInvoice) {
        const invoiceBody = {
          ownerId: owner.id,
          petId: pet.id,
          date: todayStr(),
          status: "pending",
          subtotal: "0.00",
          tax: "0.00",
          discount: "0.00",
          total: "0.00",
          notes: `Consultation for ${pet.name} - ${assessment}`,
          items: [] as any[],
        };
        const invoiceRes = await apiRequest("POST", "/api/invoices", invoiceBody);
        return invoiceRes.json();
      }
      return null;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      resetForm();
      toast({ title: "Record saved & invoice created", description: "Redirecting to billing..." });

      if (data && data.id) {
        setLocation(`/billing?invoiceId=${data.id}`);
      } else {
        setLocation("/billing");
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = assessment.trim().length > 0 && plan.trim().length > 0;

  // ── Inline Edit State ──
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState({
    diagnosis: "", treatment: "", notes: "",
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof editFields }) => {
      const res = await apiRequest("PATCH", `/api/medical-records/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records"] });
      setEditingId(null);
      toast({ title: "Record updated", description: "SOAP note has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Cannot edit", description: err.message, variant: "destructive" });
    },
  });

  // Helper: is this record editable by current user within 24 hrs?
  const isEditable = (record: any) => {
    if (!record.createdAt) return false;
    if (record.createdBy !== user?.id) return false;
    const hrs = (Date.now() - new Date(record.createdAt).getTime()) / (1000 * 60 * 60);
    return hrs <= 24;
  };

  return (
    <div className="flex flex-col gap-5 py-4" data-testid="tab-content-medical-records">
      {canAddRecords && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4">Add New SOAP Note</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs uppercase text-muted-foreground tracking-wider">Subjective</Label>
                <Textarea
                  placeholder="Owner's complaint..."
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  className="min-h-[80px] resize-none text-sm"
                  data-testid="input-soap-subjective"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs uppercase text-muted-foreground tracking-wider">Objective Findings</Label>
                <div className="border rounded-md p-3 flex flex-col gap-4 bg-muted/20">

                  {/* 1. Vital Signs */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-foreground">1. Vital Signs</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-[11px] text-muted-foreground">Temperature (°C/°F)</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 38.5"
                          value={vitals.temperature}
                          onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-[11px] text-muted-foreground">Pulse (bpm)</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 72"
                          value={vitals.pulse}
                          onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-[11px] text-muted-foreground">Heart Rate (bpm)</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 80"
                          value={vitals.heartRate}
                          onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-[11px] text-muted-foreground">Respiratory Rate (brpm)</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 20"
                          value={vitals.respiratoryRate}
                          onChange={(e) => setVitals({ ...vitals, respiratoryRate: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Mucous Membranes */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-foreground">2. Mucous Membranes</span>
                    <div className="flex flex-col gap-1.5">
                      {[
                        "Pale Roseate (Normal)",
                        "Pale",
                        "Congested",
                        "Papery White",
                        "Icteric",
                      ].map((opt) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="radio"
                            name="mucous-membranes"
                            value={opt}
                            checked={mucousMembranes === opt}
                            onChange={() => setMucousMembranes(opt)}
                            className="accent-primary w-3.5 h-3.5"
                          />
                          <span className={`text-xs ${mucousMembranes === opt ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {opt}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 3. Lymph Nodes */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-foreground">3. Lymph Nodes</span>
                    <div className="flex flex-col gap-1.5">
                      {["Normal", "Palpable", "Enlarged"].map((opt) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="lymph-nodes"
                            value={opt}
                            checked={lymphNodes === opt}
                            onChange={() => setLymphNodes(opt)}
                            className="accent-primary w-3.5 h-3.5"
                          />
                          <span className={`text-xs ${lymphNodes === opt ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                            {opt}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
            {/* ── A: ASSESSMENT ── */}
            <div className="flex flex-col gap-3 mt-3 border rounded-md p-3 bg-muted/20">
              <span className="text-xs font-bold uppercase text-primary tracking-wider">A: Assessment</span>

              {/* Diagnosis search-as-you-type */}
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] text-muted-foreground font-medium">Tentative Diagnosis / Differential</Label>
                <div className="relative">
                  <Input
                    placeholder="Type to search diagnosis (e.g. Parvovirus, Otitis...)"
                    value={diagnosisQuery}
                    onChange={(e) => {
                      setDiagnosisQuery(e.target.value);
                      setDiagnosisSelected("");
                      setDiagnosisShowSuggestions(true);
                    }}
                    onFocus={() => setDiagnosisShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setDiagnosisShowSuggestions(false), 150)}
                    className="h-8 text-sm pr-8"
                    data-testid="input-soap-diagnosis"
                  />
                  {diagnosisSelected && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-primary font-semibold">✓</span>
                  )}
                </div>
                {diagnosisShowSuggestions && diagnosisSuggestions.length > 0 && (
                  <div className="border rounded-md bg-background shadow-md z-50 max-h-44 overflow-y-auto">
                    {diagnosisSuggestions.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                        onMouseDown={() => {
                          setDiagnosisSelected(d);
                          setDiagnosisQuery(d);
                          setDiagnosisShowSuggestions(false);
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Assessment clinical notes */}
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] text-muted-foreground font-medium">
                  Description / Clinical Reasoning
                  <span className="ml-1 font-normal opacity-60">(severity, rule-outs, differentials)</span>
                </Label>
                <Textarea
                  placeholder={`• Clinical reasoning...\n• Rule-outs:\n• Severity: Mild / Moderate / Severe`}
                  value={assessmentNotes}
                  onChange={(e) => setAssessmentNotes(e.target.value)}
                  className="min-h-[70px] resize-y text-sm font-mono"
                  data-testid="input-soap-assessment"
                />
              </div>
            </div>

            {/* ── P: PLAN ── */}
            <div className="flex flex-col gap-3 mt-3 border rounded-md p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-primary tracking-wider">P: Plan</span>
                {/* Template macro picker */}
                <div className="relative">
                  <button
                    type="button"
                    className="text-[11px] text-primary underline"
                    onClick={() => setTemplateOpen((v) => !v)}
                  >
                    📋 Use Template
                  </button>
                  {templateOpen && (
                    <div className="absolute right-0 top-6 border rounded-md bg-background shadow-lg z-50 w-64">
                      <p className="text-[10px] text-muted-foreground px-3 pt-2 pb-1 font-semibold uppercase tracking-wider">Common Treatment Plans</p>
                      {TREATMENT_TEMPLATES.map((t) => (
                        <button
                          key={t.label}
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 hover:text-primary border-t first:border-0 transition-colors"
                          onClick={() => {
                            setProcedures(t.procedures);
                            setMedications(t.medications);
                            setPlanInstructions(t.instructions);
                            setTemplateOpen(false);
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Procedures / Tests */}
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] text-muted-foreground font-medium">
                  Procedures / Tests
                  <span className="ml-1 font-normal opacity-60">(e.g. Blood work, X-rays, Urinalysis)</span>
                </Label>
                <Input
                  placeholder="e.g. CBC, Biochemistry panel, Urinalysis"
                  value={procedures}
                  onChange={(e) => setProcedures(e.target.value)}
                  className="h-8 text-sm"
                  data-testid="input-soap-procedures"
                />
              </div>

              {/* Medications / Dosage */}
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] text-muted-foreground font-medium">
                  Medications / Dosage
                  <span className="ml-1 font-normal opacity-60">(Rx name, frequency, duration)</span>
                </Label>
                <Input
                  placeholder="e.g. Amoxicillin 20mg/kg BID x 7 days"
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  className="h-8 text-sm"
                  data-testid="input-soap-medications"
                />
              </div>

              {/* Instructions / Client Education */}
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] text-muted-foreground font-medium">
                  Description / Instructions
                  <span className="ml-1 font-normal opacity-60">(client education, diet, nursing care)</span>
                </Label>
                <Textarea
                  placeholder={`• Dietary changes:\n• Nursing care:\n• Follow-up: Recheck in ___ days`}
                  value={planInstructions}
                  onChange={(e) => setPlanInstructions(e.target.value)}
                  className="min-h-[80px] resize-y text-sm font-mono"
                  data-testid="input-soap-plan"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-4 flex-wrap">
              {canGenerateInvoice && owner && (
                <Button
                  variant="outline"
                  onClick={() => saveAndInvoiceMutation.mutate()}
                  disabled={!canSubmit || saveAndInvoiceMutation.isPending || saveMutation.isPending}
                  data-testid="button-save-generate-invoice"
                >
                  <Receipt className="w-4 h-4 mr-1" />
                  {saveAndInvoiceMutation.isPending ? "Saving..." : "Save & Create Invoice"}
                </Button>
              )}
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!canSubmit || saveMutation.isPending || saveAndInvoiceMutation.isPending}
                data-testid="button-save-record"
              >
                <Save className="w-4 h-4 mr-1" />
                {saveMutation.isPending ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-3">Patient History</h3>
        {recordsLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : petRecords.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No prior records.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {petRecords.map((record) => (
              <Card key={record.id} data-testid={`medical-record-${record.id}`}>
                <CardContent className="p-3">
                  {editingId === record.id ? (
                    // ── Inline Edit Form ──
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-primary">Editing SOAP Note</span>
                        <button type="button" onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-[11px] text-muted-foreground">Assessment / Diagnosis</Label>
                        <Textarea
                          value={editFields.diagnosis}
                          onChange={(e) => setEditFields({ ...editFields, diagnosis: e.target.value })}
                          className="min-h-[50px] resize-y text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-[11px] text-muted-foreground">Plan / Treatment</Label>
                        <Textarea
                          value={editFields.treatment}
                          onChange={(e) => setEditFields({ ...editFields, treatment: e.target.value })}
                          className="min-h-[50px] resize-y text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-[11px] text-muted-foreground">SOAP Notes (S / O)</Label>
                        <Textarea
                          value={editFields.notes}
                          onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })}
                          className="min-h-[50px] resize-y text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-2 mt-1">
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                        <Button
                          size="sm"
                          disabled={editMutation.isPending}
                          onClick={() => editMutation.mutate({ id: record.id, data: editFields })}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          {editMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // ── View Mode ──
                    <div>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="text-sm font-medium">{record.diagnosis}</span>
                          <span className="text-xs text-muted-foreground">{record.treatment}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isEditable(record) && (
                            <button
                              type="button"
                              title="Edit (within 24 hrs)"
                              onClick={() => {
                                setEditingId(record.id);
                                setEditFields({
                                  diagnosis: record.diagnosis,
                                  treatment: record.treatment,
                                  notes: record.notes || "",
                                });
                              }}
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <Badge variant="secondary" className="text-[10px]">{record.date}</Badge>
                        </div>
                      </div>
                      {record.prescription && (
                        <p className="text-xs text-muted-foreground mt-1">Rx: {record.prescription}</p>
                      )}
                      {record.notes && (
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{record.notes}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-muted-foreground">Dr. {record.veterinarian}</span>
                        {record.createdAt && (
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PatientChartProps {
  pet: Pet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owners: Owner[];
  onEditPet?: (pet: Pet) => void;
  onBookAppointment?: (pet: Pet) => void;
  defaultTab?: string;
}

export function PatientChart({ pet, open, onOpenChange, owners, onEditPet, onBookAppointment, defaultTab }: PatientChartProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || "patient-info");

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab || "patient-info");
    }
  }, [open, defaultTab]);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [reportDateOpen, setReportDateOpen] = useState(false);
  const [selectedReportDate, setSelectedReportDate] = useState<Date>();

  const { toast } = useToast();

  const owner = pet ? owners.find((o) => o.id === pet.ownerId) : undefined;

  // Data for report generation
  const { data: records } = useQuery<MedicalRecord[]>({ queryKey: ["/api/medical-records"] });
  const { data: appointments } = useQuery<Appointment[]>({ queryKey: ["/api/appointments"] });

  const [printConfig, setPrintConfig] = useState<{ type: "full" | "today" | "specific", date?: string } | null>(null);

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/clinic-settings"],
  });

  const medicalReportLayout = useMemo(() => {
    if (settings?.medicalReportLayout) {
      try {
        return JSON.parse(settings.medicalReportLayout);
      } catch (e) {
        console.error("Failed to parse medical report layout", e);
      }
    }
    return undefined;
  }, [settings]);

  useEffect(() => {
    if (printConfig) {
      const timer = setTimeout(() => {
        window.print();
        setPrintConfig(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printConfig]);

  const handleCameraCapture = async (file: File) => {
    if (!pet) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("petId", String(pet.id));
      const res = await fetch("/api/upload/patient-photo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      toast({ title: "Photo saved", description: `Profile photo updated for ${pet.name}.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (!pet) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <style>
        {`
          @media print {
            @page { size: A4; margin: 0; }
            body { visibility: hidden; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            
            #printable-medical-report-container {
              visibility: visible;
              position: absolute;
              left: 0;
              top: 0;
              width: 794px !important;
              height: 1123px !important;
              margin: 0;
              padding: 0;
              background: white;
              z-index: 9999;
            }
            
            #printable-medical-report-container * {
              visibility: visible;
            }
          }
        `}
      </style>

      {printConfig && pet && owner && createPortal(
        <div id="printable-medical-report-container" className="hidden print:block">
          <MedicalReportRenderer
            settings={settings || {}}
            pet={pet}
            owner={owner}
            records={records || []}
            type={printConfig.type}
            date={printConfig.date}
            layout={medicalReportLayout}
          />
        </div>,
        document.body
      )}
      <SheetContent className="sm:max-w-lg w-full p-0 flex flex-col overflow-hidden" data-testid="patient-chart-panel">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-start gap-4 p-5 pb-3 border-b">
            <div className="relative shrink-0">
              <Avatar
                className="w-14 h-14 cursor-pointer"
                onClick={() => pet.imageUrl && setFullscreenOpen(true)}
                data-testid="avatar-patient-chart"
              >
                <AvatarImage src={pet.imageUrl || ""} alt={pet.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {pet.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full"
                onClick={() => setCameraOpen(true)}
                disabled={uploading}
                data-testid="button-camera-patient-chart"
              >
                <Camera className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <h2 className="text-lg font-bold" data-testid="text-chart-pet-name">{pet.name}</h2>
              <span className="text-sm text-muted-foreground" data-testid="text-chart-pet-info">
                {pet.breed} &middot; {pet.species}
              </span>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant={pet.gender === "Female" ? "default" : "secondary"}
                  className="text-[10px]"
                  data-testid="badge-pet-gender"
                >
                  {pet.gender === "Female" ? "♀" : "♂"} {pet.gender}
                </Badge>
                {pet.weight && (
                  <span className="text-xs text-muted-foreground border rounded-md px-2 py-0.5" data-testid="text-chart-weight">
                    {pet.weight}kg
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <div className="px-5 pt-3">
                <TabsList className="w-full flex justify-between h-auto bg-transparent p-0 gap-2 overflow-x-auto no-scrollbar" data-testid="tabs-patient-chart">
                  <TabsTrigger value="patient-info" className="text-[11px] px-2 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-none rounded-md border border-transparent data-[state=active]:border-border bg-muted/50 whitespace-nowrap" data-testid="tab-patient-info">Patient Info</TabsTrigger>
                  <TabsTrigger value="owner" className="text-[11px] px-2 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-none rounded-md border border-transparent data-[state=active]:border-border bg-muted/50 whitespace-nowrap" data-testid="tab-owner">Owner</TabsTrigger>
                  <TabsTrigger value="history" className="text-[11px] px-2 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-none rounded-md border border-transparent data-[state=active]:border-border bg-muted/50 whitespace-nowrap" data-testid="tab-history">History</TabsTrigger>
                  <TabsTrigger value="documents" className="text-[11px] px-2 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-none rounded-md border border-transparent data-[state=active]:border-border bg-muted/50 whitespace-nowrap" data-testid="tab-documents">Documents</TabsTrigger>
                  <TabsTrigger value="medical-records" className="text-[11px] px-2 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-none rounded-md border border-transparent data-[state=active]:border-border bg-muted/50 whitespace-nowrap" data-testid="tab-medical-records">Medical Records</TabsTrigger>
                  <TabsTrigger value="lab" className="text-[11px] px-2 h-9 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-none rounded-md border border-transparent data-[state=active]:border-border bg-muted/50 whitespace-nowrap" data-testid="tab-lab">LAB</TabsTrigger>
                </TabsList>
              </div>
              <div className="px-5 pb-5 flex-1 overflow-auto">
                <TabsContent value="patient-info" className="mt-0">
                  <PatientInfoTab pet={pet} />
                </TabsContent>
                <TabsContent value="owner" className="mt-0">
                  <OwnerTab owner={owner} />
                </TabsContent>
                <TabsContent value="history" className="mt-0">
                  <HistoryTab petId={pet.id} />
                </TabsContent>
                <TabsContent value="documents" className="mt-0">
                  <DocumentsTab petId={pet.id} />
                </TabsContent>
                <TabsContent value="medical-records" className="mt-0">
                  <MedicalRecordsTab pet={pet} owner={owner} />
                </TabsContent>
                <TabsContent value="lab" className="mt-0">
                  <LabReportsTab petId={pet.id} pet={pet} owner={owner} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="flex items-center gap-3 p-4 border-t bg-background">
            <Button
              className="flex-1"
              onClick={() => onBookAppointment?.(pet)}
              data-testid="button-book-appointment"
            >
              <CalendarDays className="w-4 h-4 mr-1" />
              Book Appointment
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onEditPet?.(pet)}
              data-testid="button-edit-patient"
            >
              <Pencil className="w-4 h-4 mr-1" />
              Edit Patient
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1" data-testid="button-print-report">
                  <Receipt className="w-4 h-4 mr-1" />
                  Print Report
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setPrintConfig({
                    type: "today"
                  });
                }}>
                  Today's Visit Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setPrintConfig({
                    type: "full"
                  });
                }}>
                  Full Medical History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setReportDateOpen(true)}>
                  Select Date...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </SheetContent>
      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={handleCameraCapture}
      />
      <FullscreenImage
        src={pet.imageUrl || ""}
        alt={pet.name}
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
      />

      <Dialog open={reportDateOpen} onOpenChange={setReportDateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Report Date</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedReportDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedReportDate ? format(selectedReportDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedReportDate}
                    onSelect={setSelectedReportDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDateOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedReportDate}
              onClick={() => {
                if (selectedReportDate && owner) {
                  const dateStr = format(selectedReportDate, "yyyy-MM-dd");
                  setPrintConfig({
                    type: "specific",
                    date: dateStr
                  });
                  setReportDateOpen(false);
                  setSelectedReportDate(undefined);
                }
              }}
            >
              Print Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
