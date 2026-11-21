import { useState, useMemo, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { formatTime12h } from "@/lib/utils";
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
import { DEFAULT_PLAN_TEMPLATES } from "@/lib/medical-templates";
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
import { cn, formatWhatsAppLink } from "@/lib/utils";
import { FaWhatsapp } from "react-icons/fa";
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
import type { Pet, Owner, Appointment, MedicalRecord, Invoice } from "@shared/schema";
import { CreditCard, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
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
          <span className="text-sm font-semibold" data-testid="text-pet-age">
            {[pet.age > 0 ? `${pet.age} year${pet.age !== 1 ? "s" : ""}` : "", (pet.ageMonths ?? 0) > 0 ? `${pet.ageMonths} month${pet.ageMonths !== 1 ? "s" : ""}` : ""].filter(Boolean).join(" ") || "< 1 month"}
          </span>
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
  const { data: appointments, isLoading: apptLoading } = useQuery<Appointment[]>({ queryKey: ["/api/appointments"] });
  const { data: allInvoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });

  const petAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter((a) => a.petId === petId);
  }, [appointments, petId]);

  const petInvoices = useMemo(() => {
    if (!allInvoices) return [];
    return allInvoices.filter((inv) => inv.petId === petId);
  }, [allInvoices, petId]);

  const dateGroups = useMemo(() => {
    const map: Record<string, { appointments: typeof petAppointments; invoices: typeof petInvoices }> = {};
    for (const appt of petAppointments) {
      if (!map[appt.date]) map[appt.date] = { appointments: [], invoices: [] };
      map[appt.date].appointments.push(appt);
    }
    for (const inv of petInvoices) {
      if (!map[inv.date]) map[inv.date] = { appointments: [], invoices: [] };
      map[inv.date].invoices.push(inv);
    }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [petAppointments, petInvoices]);

  const [visibleHistoryCount, setVisibleHistoryCount] = useState(5);
  
  const displayedDateGroups = useMemo(() => {
    return dateGroups.slice(0, visibleHistoryCount);
  }, [dateGroups, visibleHistoryCount]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
      case "pending":   return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
      case "cancelled": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800";
      case "partial":   return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
      default:          return "bg-muted text-muted-foreground border-border";
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "";
    const map: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card", cheque: "Cheque", other: "Other" };
    return map[method.toLowerCase()] || method;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  if (apptLoading || invoicesLoading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-4" data-testid="tab-content-history">
      {dateGroups.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-25" />
          <p className="font-medium">No history found</p>
          <p className="text-xs mt-1 opacity-70">Visits and payments will appear here.</p>
        </div>
      ) : (
        displayedDateGroups.map(([date, { appointments: appts, invoices: invs }]) => (
          <div key={date} className="flex flex-col">
            {/* Date separator */}
            <div className="flex items-center gap-2 px-1 py-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap px-1">
                {formatDate(date)}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Events for this date */}
            <div className="flex flex-col gap-2 pb-3">
              {/* Appointments */}
              {appts.map((appt) => (
                <Card key={`appt-${appt.id}`} data-testid={`history-item-${appt.id}`}>
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      <div className="w-1 shrink-0 bg-primary/60" />
                      <div className="flex items-center justify-between gap-2 flex-wrap p-3 flex-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">{appt.type}</span>
                            <span className="text-xs text-muted-foreground">{formatTime12h(appt.time)}</span>
                          </div>
                        </div>
                        <Badge
                          variant={appt.status === "completed" ? "default" : appt.status === "cancelled" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {appt.status}
                        </Badge>
                      </div>
                    </div>
                    {appt.notes && (
                      <p className="text-xs text-muted-foreground px-4 pb-2">{appt.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Invoices */}
              {invs.map((inv) => (
                <Card key={`inv-${inv.id}`} className="overflow-hidden" data-testid={`payment-item-${inv.id}`}>
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      <div className={`w-1 shrink-0 ${
                        inv.status === "paid"      ? "bg-emerald-500" :
                        inv.status === "pending"   ? "bg-amber-500"  :
                        inv.status === "cancelled" ? "bg-red-500"    : "bg-primary"
                      }`} />
                      <div className="flex flex-col gap-1 p-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Receipt className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-mono font-bold text-foreground">{inv.invoiceNumber}</span>
                            {inv.status === "paid" && inv.paymentMethod && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <span className="opacity-40">·</span>
                                <CreditCard className="w-2.5 h-2.5" />
                                {getPaymentMethodLabel(inv.paymentMethod)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-bold text-foreground">
                              ₹{parseFloat(inv.total || "0").toFixed(2)}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${getStatusColor(inv.status)}`}>
                              {inv.status}
                            </span>
                          </div>
                        </div>
                        {inv.notes && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {inv.notes.slice(0, 60)}{inv.notes.length > 60 ? "…" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
      
      {visibleHistoryCount < dateGroups.length && (
        <div className="flex justify-center mt-2 pb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setVisibleHistoryCount((prev) => prev + 5)}
            className="text-xs"
          >
            Load More ({dateGroups.length - visibleHistoryCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}




// ─── Helpers: parse structured SOAP note storage format ───────────────────────

function parseSoapNotes(notes: string | null): { subjective: string; objective: string } {
  if (!notes) return { subjective: "", objective: "" };
  const subjMatch = notes.match(/SUBJECTIVE:\s*([\s\S]*?)(?=OBJECTIVE:|$)/i);
  const objMatch = notes.match(/OBJECTIVE:\s*([\s\S]*?)$/i);
  return {
    subjective: subjMatch?.[1]?.trim() || "",
    objective: objMatch?.[1]?.trim() || "",
  };
}

function parseTreatment(treatment: string | null): { procedures: string; medications: string[]; instructions: string } {
  if (!treatment) return { procedures: "", medications: [], instructions: "" };
  const procMatch = treatment.match(/Procedures\/Tests:\s*(.*?)(?=Medications\/Dosage:|Instructions:|$)/is);
  const medMatch = treatment.match(/Medications\/Dosage:\s*([\s\S]*?)(?=Instructions:|$)/i);
  const instMatch = treatment.match(/Instructions:\s*([\s\S]*?)$/i);
  const medRaw = medMatch?.[1]?.trim() || "";
  const medications = medRaw
    ? medRaw.split(/\n/).map(l => l.replace(/^\s*\d+\.\s*/, "").trim()).filter(Boolean)
    : [];
  return {
    procedures: procMatch?.[1]?.trim() || "",
    medications,
    instructions: instMatch?.[1]?.trim() || "",
  };
}

function parseObjective(objective: string): Array<{ label: string; value: string }> {
  if (!objective) return [];
  return objective.split("|").map(part => {
    const [label, ...rest] = part.trim().split(":");
    return { label: label?.trim() || "", value: rest.join(":").trim() };
  }).filter(v => v.label && v.value);
}

// Parse the stored 'diagnosis' field which is formatted as:
// "Diagnosis: <name>\nNotes: <clinical reasoning>"
// Also handles legacy plain-text entries (no prefix).
function parseAssessment(diagnosis: string | null): { diagnosis: string; notes: string } {
  if (!diagnosis) return { diagnosis: "", notes: "" };
  // Use [\s\S]+? so multi-line diagnosis names are captured correctly,
  // and use a non-multiline $ via lookahead to stop only at \nNotes: or true end-of-string.
  const diagMatch = diagnosis.match(/^Diagnosis:\s*([\s\S]+?)(?=\nNotes:|\s*$)/i);
  // Notes: capture everything after the label to the true end-of-string (no multiline flag on $)
  const notesMatch = diagnosis.match(/\nNotes:\s*([\s\S]*)$/i);
  if (diagMatch || notesMatch) {
    return {
      diagnosis: diagMatch?.[1]?.trim() || "",
      notes: notesMatch?.[1]?.trim() || "",
    };
  }
  // Legacy / plain-text: show as-is in diagnosis field
  return { diagnosis: diagnosis.trim(), notes: "" };
}


// ─── Medical Record Card (Rich Structured SOAP View) ─────────────────────────

function MedicalRecordCard({
  record,
  highlightRecordId,
  isEditable,
  onEdit,
}: {
  record: MedicalRecord;
  highlightRecordId?: number;
  isEditable: boolean;
  onEdit: () => void;
}) {
  const { subjective, objective } = parseSoapNotes(record.notes);
  const { procedures, medications, instructions } = parseTreatment(record.treatment);
  const vitals = parseObjective(objective);
  const { diagnosis: diagnosisLabel, notes: assessmentNotes } = parseAssessment(record.diagnosis);

  return (
    <div className="flex flex-col gap-0">
      {/* ── Header Row ── */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary/70 shrink-0" />
          <span className="text-xs font-bold text-primary font-mono">{record.date}</span>
          {record.createdAt && (
            <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
              · {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground font-medium">Dr. {record.veterinarian}</span>
          {isEditable && (
            <button
              type="button"
              title="Edit record"
              onClick={onEdit}
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── S: Subjective ── */}
      {subjective && (
        <div className="mb-2.5 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">S · Subjective</span>
          </div>
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-wrap">{subjective}</p>
        </div>
      )}

      {/* ── O: Objective (Vitals) ── */}
      {vitals.length > 0 && (
        <div className="mb-2.5 px-3 py-2 rounded-lg bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400">O · Objective</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {vitals.map(({ label, value }) => (
              <span key={label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-sky-900/40 border border-sky-200 dark:border-sky-800 text-[10px] font-medium text-sky-800 dark:text-sky-200 shadow-sm">
                <span className="text-sky-500/80 font-semibold">{label}:</span>
                {value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── A: Assessment (Diagnosis) ── */}
      {(diagnosisLabel || assessmentNotes) && (
        <div className="mb-2.5 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">A · Assessment</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {diagnosisLabel && (
              <div className="flex items-start gap-1.5">
                <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wide shrink-0 mt-0.5">Dx:</span>
                <p className="text-xs text-violet-900 dark:text-violet-200 leading-relaxed font-medium">{diagnosisLabel}</p>
              </div>
            )}
            {assessmentNotes && (
              <div className="flex items-start gap-1.5">
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wide shrink-0 mt-0.5">Notes:</span>
                <p className="text-xs text-violet-800 dark:text-violet-300 leading-relaxed whitespace-pre-wrap">{assessmentNotes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── P: Plan ── */}
      {(procedures || medications.length > 0 || instructions) && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">P · Plan</span>
          </div>
          <div className="flex flex-col gap-2">
            {procedures && (
              <div>
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5 uppercase tracking-wide">Procedures / Tests</p>
                <p className="text-xs text-emerald-900 dark:text-emerald-200">{procedures}</p>
              </div>
            )}
            {medications.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 uppercase tracking-wide">Medications / Dosage</p>
                <ol className="flex flex-col gap-0.5 pl-1">
                  {medications.map((med, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-900 dark:text-emerald-200">
                      <span className="font-mono font-bold text-emerald-500 text-[10px] mt-0.5 shrink-0">{i + 1}.</span>
                      <span className="leading-relaxed">{med}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {instructions && (
              <div>
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5 uppercase tracking-wide">Instructions</p>
                <p className="text-xs text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap leading-relaxed">{instructions}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prescription (if any) */}
      {record.prescription && (
        <div className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide mr-1.5">Rx:</span>
          <span className="text-xs text-rose-900 dark:text-rose-200">{record.prescription}</span>
        </div>
      )}
    </div>
  );
}

function MedicalRecordsTab({ pet, owner, highlightRecordId }: { pet: Pet; owner: Owner | undefined; highlightRecordId?: number }) {

  const { toast } = useToast();
  const { user, hasPermission } = useAuth();
  const [, setLocation] = useLocation();

  const { data: records, isLoading: recordsLoading } = useQuery<MedicalRecord[]>({ queryKey: ["/api/medical-records"] });
  const { data: appointments } = useQuery<any[]>({ queryKey: ["/api/appointments"] });

  const [visibleCount, setVisibleCount] = useState(5);

  const petRecords = useMemo(() => {
    if (!records) return [];
    return records
      .filter((r) => r.petId === pet.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, pet.id]);

  const displayedRecords = useMemo(() => {
    return petRecords.slice(0, visibleCount);
  }, [petRecords, visibleCount]);

  const canAddRecords = hasPermission("medical_records.create", "medical_records.manage");
  const canGenerateInvoice = hasPermission("billing.manage", "billing.create");

  // Scroll highlighted record into view when chart opens with a deep-link
  useEffect(() => {
    if (!highlightRecordId) return;
    const el = document.getElementById(`record-card-${highlightRecordId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightRecordId, petRecords]);

  const [subjective, setSubjective] = useState("");

  // Structured Assessment fields
  const [diagnosisQuery, setDiagnosisQuery] = useState("");
  const [diagnosisSelected, setDiagnosisSelected] = useState("");
  const [diagnosisShowSuggestions, setDiagnosisShowSuggestions] = useState(false);
  const [assessmentNotes, setAssessmentNotes] = useState("");

  // Serialise assessment for API — use diagnosisSelected (from dropdown) or fall back
  // to diagnosisQuery (free-typed) so the diagnosis is never silently dropped
  const effectiveDiagnosis = diagnosisSelected || diagnosisQuery.trim();
  const assessment = [
    effectiveDiagnosis ? `Diagnosis: ${effectiveDiagnosis}` : "",
    assessmentNotes ? `Notes: ${assessmentNotes}` : "",
  ].filter(Boolean).join("\n");

  // Structured Plan fields
  const [procedures, setProcedures] = useState("");
  const [medications, setMedications] = useState<string[]>([""]);
  const [planInstructions, setPlanInstructions] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);

  // Serialise plan for API
  const plan = [
    procedures ? `Procedures/Tests: ${procedures}` : "",
    medications.some(m => m.trim()) ? `Medications/Dosage:\n${medications.filter(m => m.trim()).map((m, i) => `  ${i + 1}. ${m.trim()}`).join("\n")}` : "",
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

  // ── Draft Auto-Save (localStorage) ──
  const DRAFT_KEY = `soap_draft_pet_${pet.id}`;
  const [hasDraft, setHasDraft] = useState(false);

  // On mount: check if a draft exists for this pet
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        // Only show banner if at least one field has content
        const hasContent = d.subjective || d.vitals?.temperature || d.vitals?.pulse ||
          d.vitals?.heartRate || d.vitals?.respiratoryRate || d.mucousMembranes ||
          d.lymphNodes || d.diagnosisQuery || d.assessmentNotes ||
          d.procedures || d.medications?.some((m: string) => m.trim());
        if (hasContent) setHasDraft(true);
      }
    } catch (_) {}
  }, [pet.id]);

  // Auto-save draft on any field change
  useEffect(() => {
    const draft = {
      subjective, vitals, mucousMembranes, lymphNodes,
      diagnosisQuery, diagnosisSelected, assessmentNotes,
      procedures, medications, planInstructions,
    };
    try {
      const hasContent = subjective || vitals.temperature || vitals.pulse ||
        vitals.heartRate || vitals.respiratoryRate || mucousMembranes ||
        lymphNodes || diagnosisQuery || assessmentNotes ||
        procedures || medications.some(m => m.trim()) || planInstructions;
      if (hasContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    } catch (_) {}
  }, [subjective, vitals, mucousMembranes, lymphNodes, diagnosisQuery, diagnosisSelected, assessmentNotes, procedures, medications, planInstructions]);

  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const d = JSON.parse(saved);
      if (d.subjective !== undefined) setSubjective(d.subjective);
      if (d.vitals) setVitals(d.vitals);
      if (d.mucousMembranes !== undefined) setMucousMembranes(d.mucousMembranes);
      if (d.lymphNodes !== undefined) setLymphNodes(d.lymphNodes);
      if (d.diagnosisQuery !== undefined) setDiagnosisQuery(d.diagnosisQuery);
      if (d.diagnosisSelected !== undefined) setDiagnosisSelected(d.diagnosisSelected);
      if (d.assessmentNotes !== undefined) setAssessmentNotes(d.assessmentNotes);
      if (d.procedures !== undefined) setProcedures(d.procedures);
      if (d.medications && Array.isArray(d.medications)) setMedications(d.medications);
      if (d.planInstructions !== undefined) setPlanInstructions(d.planInstructions);
      setHasDraft(false);
      toast({ title: "Draft restored", description: "Your previous unsaved data has been loaded." });
    } catch (_) {}
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  const resetForm = () => {
    setSubjective("");
    setVitals({ temperature: "", pulse: "", heartRate: "", respiratoryRate: "" });
    setMucousMembranes("");
    setLymphNodes("");
    setDiagnosisQuery("");
    setDiagnosisSelected("");
    setAssessmentNotes("");
    setProcedures("");
    setMedications([""]);
    setPlanInstructions("");
    // Clear any draft from localStorage on explicit save
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
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

  // Treatment plan templates — admin-configured custom templates merged with shared defaults
  const { data: clinicSettings } = useQuery<Record<string, string>>({ queryKey: ["/api/clinic-settings"] });

  // Merge custom (admin-defined) templates with shared defaults
  const TREATMENT_TEMPLATES = (() => {
    try {
      const raw = clinicSettings?.medicalPlanTemplates;
      if (raw) return JSON.parse(raw) as typeof DEFAULT_PLAN_TEMPLATES;
    } catch { /* fall through */ }
    return DEFAULT_PLAN_TEMPLATES;
  })();


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
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
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

  const canSubmit = true; // All SOAP fields are now optional

  // ── Inline Edit State ──
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState({
    diagnosis: "", treatment: "", notes: "",
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof editFields }) => {
      const res = await apiRequest("PATCH", `/api/medical-records/${id}`, data);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to update record" }));
        throw new Error(err.message || "Failed to update record");
      }
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

  // Helper: is this record editable by current user?
  const isEditable = (record: any) => {
    if (!record.createdAt) return false;
    return record.createdBy === user?.id;
  };

  return (
    <div className="flex flex-col gap-5 py-4" data-testid="tab-content-medical-records">
      {canAddRecords && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4">Add New SOAP Note</h3>

            {/* ── Draft Restore Banner ── */}
            {hasDraft && (
              <div className="flex items-center justify-between gap-2 mb-4 p-2.5 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 shrink-0"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 5v5l4 2"/></svg>
                  <span className="text-xs text-amber-800 dark:text-amber-200 font-medium">Unsaved draft found. Continue from where you left off?</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={restoreDraft}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={discardDraft}
                    className="text-[11px] font-medium px-2.5 py-1 rounded border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

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
                            // Split template medications by semicolon into separate rows
                            setMedications(t.medications.split(";").map(m => m.trim()).filter(Boolean));
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

              {/* Medications / Dosage — multi-row editor */}
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] text-muted-foreground font-medium">
                  Medications / Dosage
                  <span className="ml-1 font-normal opacity-60">(Rx name, frequency, duration — Enter to add next)</span>
                </Label>
                <div className="flex flex-col gap-1.5">
                  {medications.map((med, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground w-4 text-right shrink-0 font-mono">{idx + 1}.</span>
                      <Input
                        placeholder={idx === 0 ? "e.g. Amoxicillin 20mg/kg BID x 7 days" : "Next medication..."}
                        value={med}
                        onChange={(e) => {
                          const next = [...medications];
                          next[idx] = e.target.value;
                          setMedications(next);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const next = [...medications];
                            // Insert new empty row after current
                            next.splice(idx + 1, 0, "");
                            setMedications(next);
                            // Focus the newly created input after render
                            setTimeout(() => {
                              const inputs = document.querySelectorAll<HTMLInputElement>('[data-med-input]');
                              inputs[idx + 1]?.focus();
                            }, 30);
                          } else if (e.key === "Backspace" && med === "" && medications.length > 1) {
                            // Remove empty row on backspace if there's more than one
                            e.preventDefault();
                            const next = medications.filter((_, i) => i !== idx);
                            setMedications(next);
                            setTimeout(() => {
                              const inputs = document.querySelectorAll<HTMLInputElement>('[data-med-input]');
                              inputs[Math.max(0, idx - 1)]?.focus();
                            }, 30);
                          }
                        }}
                        className="h-8 text-sm flex-1"
                        data-med-input
                        data-testid={`input-soap-medications-${idx}`}
                      />
                      {medications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMedications(medications.filter((_, i) => i !== idx))}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5 rounded"
                          title="Remove"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMedications([...medications, ""])}
                    className="self-start text-[11px] text-primary/70 hover:text-primary transition-colors flex items-center gap-1 mt-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add medication
                  </button>
                </div>
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
            {displayedRecords.map((record) => (
              <Card
                key={record.id}
                id={`record-card-${record.id}`}
                data-testid={`medical-record-${record.id}`}
                className={record.id === highlightRecordId ? "ring-2 ring-amber-400 ring-offset-1 transition-shadow" : ""}
              >
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
                    // ── View Mode ── Rich Structured SOAP Card
                    <MedicalRecordCard
                      record={record}
                      highlightRecordId={highlightRecordId}
                      isEditable={isEditable(record)}
                      onEdit={() => {
                        setEditingId(record.id);
                        setEditFields({
                          diagnosis: record.diagnosis,
                          treatment: record.treatment,
                          notes: record.notes || "",
                        });
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
            
            {visibleCount < petRecords.length && (
              <div className="flex justify-center mt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setVisibleCount((prev) => prev + 5)}
                  className="text-xs"
                >
                  Load More ({petRecords.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div >
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
  highlightRecordId?: number;
}

export function PatientChart({ pet, open, onOpenChange, owners, onEditPet, onBookAppointment, defaultTab, highlightRecordId }: PatientChartProps) {
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
                  <MedicalRecordsTab pet={pet} owner={owner} highlightRecordId={highlightRecordId} />
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
