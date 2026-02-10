import { useState, useMemo, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CameraCapture } from "@/components/camera-capture";
import { FullscreenImage } from "@/components/fullscreen-image";
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
} from "lucide-react";
import type { Pet, Owner, Appointment, MedicalRecord } from "@shared/schema";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
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
            {owner.firstName.charAt(0)}{owner.lastName.charAt(0)}
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

function DocumentsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground" data-testid="tab-content-documents">
      <FolderOpen className="w-8 h-8 mb-2 opacity-30" />
      <p className="text-sm">No documents uploaded yet.</p>
      <p className="text-xs mt-1">Document uploads coming soon.</p>
    </div>
  );
}

function MedicalRecordsTab({ pet, owner }: { pet: Pet; owner: Owner | undefined }) {
  const { toast } = useToast();
  const { user, hasPermission } = useAuth();
  const [, setLocation] = useLocation();

  const { data: records, isLoading: recordsLoading } = useQuery<MedicalRecord[]>({ queryKey: ["/api/medical-records"] });

  const petRecords = useMemo(() => {
    if (!records) return [];
    return records
      .filter((r) => r.petId === pet.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, pet.id]);

  const canAddRecords = hasPermission("medical_records.create", "medical_records.manage");
  const canGenerateInvoice = hasPermission("billing.manage", "billing.create");

  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");

  const resetForm = () => {
    setSubjective("");
    setObjective("");
    setAssessment("");
    setPlan("");
  };

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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      resetForm();
      toast({ title: "Record saved & invoice created", description: "Redirecting to billing..." });
      setLocation("/admin/billing");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = assessment.trim().length > 0 && plan.trim().length > 0;

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
                <Label className="text-xs uppercase text-muted-foreground tracking-wider">Objective</Label>
                <Textarea
                  placeholder="Vitals, Exam findings..."
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="min-h-[80px] resize-none text-sm"
                  data-testid="input-soap-objective"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mt-3">
              <Label className="text-xs uppercase text-muted-foreground tracking-wider">Assessment</Label>
              <Textarea
                placeholder="Diagnosis..."
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
                data-testid="input-soap-assessment"
              />
            </div>
            <div className="flex flex-col gap-1.5 mt-3">
              <Label className="text-xs uppercase text-muted-foreground tracking-wider">Plan</Label>
              <Textarea
                placeholder="Treatment, Meds, Follow-up..."
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
                data-testid="input-soap-plan"
              />
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
                  {saveAndInvoiceMutation.isPending ? "Saving..." : "Save & Generate Invoice"}
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
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{record.diagnosis}</span>
                      <span className="text-xs text-muted-foreground">{record.treatment}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{record.date}</Badge>
                  </div>
                  {record.prescription && (
                    <p className="text-xs text-muted-foreground mt-1">Rx: {record.prescription}</p>
                  )}
                  <span className="text-[11px] text-muted-foreground mt-1 block">Dr. {record.veterinarian}</span>
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
  const { toast } = useToast();

  const owner = pet ? owners.find((o) => o.id === pet.ownerId) : undefined;

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
                <TabsList className="w-full grid grid-cols-5 h-auto" data-testid="tabs-patient-chart">
                  <TabsTrigger value="patient-info" className="text-[11px] px-1" data-testid="tab-patient-info">Patient Info</TabsTrigger>
                  <TabsTrigger value="owner" className="text-[11px] px-1" data-testid="tab-owner">Owner</TabsTrigger>
                  <TabsTrigger value="history" className="text-[11px] px-1" data-testid="tab-history">History</TabsTrigger>
                  <TabsTrigger value="documents" className="text-[11px] px-1" data-testid="tab-documents">Documents</TabsTrigger>
                  <TabsTrigger value="medical-records" className="text-[11px] px-1" data-testid="tab-medical-records">Medical Records</TabsTrigger>
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
                  <DocumentsTab />
                </TabsContent>
                <TabsContent value="medical-records" className="mt-0">
                  <MedicalRecordsTab pet={pet} owner={owner} />
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
    </Sheet>
  );
}
