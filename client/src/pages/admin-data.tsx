import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Trash2,
  AlertTriangle,
  Database,
  Stethoscope,
  CalendarDays,
  PawPrint,
  Users,
  Receipt,
  ShieldAlert,
} from "lucide-react";

interface DataCounts {
  owners: number;
  pets: number;
  appointments: number;
  medicalRecords: number;
  invoices: number;
}

type EraseTarget = "medical-records" | "appointments" | "pets" | "owners" | "invoices" | "all";

const eraseOptions: { target: EraseTarget; label: string; description: string; icon: typeof Trash2; warning: string }[] = [
  {
    target: "medical-records",
    label: "Medical Records",
    description: "Erase all medical records, SOAP notes, diagnoses, and prescriptions",
    icon: Stethoscope,
    warning: "This will permanently delete all medical records. This action cannot be undone.",
  },
  {
    target: "appointments",
    label: "Appointments",
    description: "Erase all scheduled, completed, and cancelled appointments",
    icon: CalendarDays,
    warning: "This will permanently delete all appointments. This action cannot be undone.",
  },
  {
    target: "invoices",
    label: "Invoices & Billing",
    description: "Erase all invoices, invoice items, and billing data",
    icon: Receipt,
    warning: "This will permanently delete all invoices and billing data. This action cannot be undone.",
  },
  {
    target: "pets",
    label: "Patients (Pets)",
    description: "Erase all patient records. This also removes their medical records and appointments.",
    icon: PawPrint,
    warning: "This will permanently delete all patients along with their medical records and appointments. This action cannot be undone.",
  },
  {
    target: "owners",
    label: "Owners & All Related Data",
    description: "Erase all owners. This also removes all patients, appointments, records, and invoices.",
    icon: Users,
    warning: "This will permanently delete all owners and ALL related data (patients, appointments, medical records, invoices). This action cannot be undone.",
  },
  {
    target: "all",
    label: "Erase Everything",
    description: "Completely wipe all clinic data including owners, patients, appointments, records, and invoices",
    icon: ShieldAlert,
    warning: "This will permanently erase ALL clinic data. Only user accounts, roles, and fee structures will remain. This action CANNOT be undone.",
  },
];

function ConfirmEraseDialog({
  open,
  onOpenChange,
  target,
  option,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: EraseTarget;
  option: typeof eraseOptions[0];
  onConfirm: () => void;
  isPending: boolean;
}) {
  const [confirmText, setConfirmText] = useState("");
  const requiredText = target === "all" ? "ERASE ALL DATA" : "ERASE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Confirm Data Erasure
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-start gap-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{option.warning}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-erase" className="text-sm">
              Type <span className="font-mono font-bold">{requiredText}</span> to confirm
            </Label>
            <Input
              id="confirm-erase"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requiredText}
              data-testid="input-confirm-erase"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-erase">
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== requiredText || isPending}
              onClick={onConfirm}
              data-testid="button-confirm-erase"
            >
              {isPending ? "Erasing..." : "Erase Data"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminData() {
  const { toast } = useToast();
  const [eraseTarget, setEraseTarget] = useState<EraseTarget | null>(null);

  const { data: counts, isLoading } = useQuery<DataCounts>({
    queryKey: ["/api/data/counts"],
  });

  const eraseMutation = useMutation({
    mutationFn: async (target: EraseTarget) => {
      const res = await apiRequest("DELETE", `/api/data/${target}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/data/counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setEraseTarget(null);
      toast({ title: "Data erased", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const activeOption = eraseOptions.find((o) => o.target === eraseTarget);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto" data-testid="page-admin-data">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Data Management</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          View data counts and erase clinic data. Only accessible to super administrators.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : counts && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card data-testid="count-owners">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Owners
              </span>
              <span className="text-2xl font-bold">{counts.owners}</span>
            </CardContent>
          </Card>
          <Card data-testid="count-pets">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <PawPrint className="w-3.5 h-3.5" /> Patients
              </span>
              <span className="text-2xl font-bold">{counts.pets}</span>
            </CardContent>
          </Card>
          <Card data-testid="count-appointments">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Appointments
              </span>
              <span className="text-2xl font-bold">{counts.appointments}</span>
            </CardContent>
          </Card>
          <Card data-testid="count-records">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" /> Records
              </span>
              <span className="text-2xl font-bold">{counts.medicalRecords}</span>
            </CardContent>
          </Card>
          <Card data-testid="count-invoices">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" /> Invoices
              </span>
              <span className="text-2xl font-bold">{counts.invoices}</span>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Erase Data</h2>
        <p className="text-xs text-muted-foreground">
          Select a category below to permanently erase data. A confirmation is required before any data is deleted.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {eraseOptions.map((option) => (
          <Card key={option.target} data-testid={`erase-card-${option.target}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-md bg-destructive/10 shrink-0">
                <option.icon className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex flex-col gap-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{option.label}</span>
                  {option.target === "all" && (
                    <Badge variant="destructive" className="text-[10px]">Danger</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{option.description}</p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setEraseTarget(option.target)}
                  data-testid={`button-erase-${option.target}`}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Erase {option.label}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {eraseTarget && activeOption && (
        <ConfirmEraseDialog
          open={true}
          onOpenChange={(v) => { if (!v) setEraseTarget(null); }}
          target={eraseTarget}
          option={activeOption}
          onConfirm={() => eraseMutation.mutate(eraseTarget)}
          isPending={eraseMutation.isPending}
        />
      )}
    </div>
  );
}
