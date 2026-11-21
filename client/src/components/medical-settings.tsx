import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, FileText, RotateCcw } from "lucide-react";
import { DEFAULT_PLAN_TEMPLATES, type PlanTemplate } from "@/lib/medical-templates";

// ─── API helpers ──────────────────────────────────────────────────────────────
const TEMPLATES_SETTING_KEY = "medicalPlanTemplates";

function parseTemplates(settings: Record<string, string> | undefined): PlanTemplate[] | null {
  if (!settings) return null; // still loading
  try {
    const raw = settings[TEMPLATES_SETTING_KEY];
    if (!raw) return null; // not configured yet — show defaults
    return JSON.parse(raw) as PlanTemplate[];
  } catch {
    return null;
  }
}

// ─── TemplateFormDialog ────────────────────────────────────────────────────
function TemplateFormDialog({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: PlanTemplate;
  onSave: (t: PlanTemplate) => void;
}) {
  const [form, setForm] = useState<PlanTemplate>(initial);
  const handleOpenChange = (v: boolean) => { if (!v) onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Edit Treatment Template
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium">Template Name *</Label>
            <Input
              placeholder="e.g. Gastroenteritis, Post-Surgery Recovery…"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium">
              Procedures / Tests
              <span className="ml-1 font-normal text-muted-foreground">(e.g. CBC, X-ray, Urinalysis)</span>
            </Label>
            <Input
              placeholder="e.g. CBC, Biochemistry panel"
              value={form.procedures}
              onChange={(e) => setForm({ ...form, procedures: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium">
              Medications / Dosage
              <span className="ml-1 font-normal text-muted-foreground">(separate multiple with semicolons)</span>
            </Label>
            <Textarea
              placeholder="e.g. Amoxicillin 20mg/kg BID x 7 days; Meloxicam 0.1mg/kg SID"
              value={form.medications}
              onChange={(e) => setForm({ ...form, medications: e.target.value })}
              className="min-h-[70px] resize-y text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium">Instructions / Client Education</Label>
            <Textarea
              placeholder="e.g. Bland diet for 3-5 days; recheck in 7 days…"
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              className="min-h-[70px] resize-y text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { if (!form.label.trim()) return; onSave(form); }} disabled={!form.label.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── AddTemplateDialog ─────────────────────────────────────────────────────
function AddTemplateDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (t: Omit<PlanTemplate, "id">) => void;
}) {
  const blank = { label: "", procedures: "", medications: "", instructions: "" };
  const [form, setForm] = useState(blank);
  const handleOpenChange = (v: boolean) => { if (!v) { setForm(blank); onClose(); } };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            New Treatment Template
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium">Template Name *</Label>
            <Input
              placeholder="e.g. Ringworm, Kennel Cough…"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium">Procedures / Tests</Label>
            <Input
              placeholder="e.g. CBC, Biochemistry panel"
              value={form.procedures}
              onChange={(e) => setForm({ ...form, procedures: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium">Medications / Dosage</Label>
            <Textarea
              placeholder="e.g. Amoxicillin 20mg/kg BID x 7 days"
              value={form.medications}
              onChange={(e) => setForm({ ...form, medications: e.target.value })}
              className="min-h-[70px] resize-y text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs font-medium">Instructions / Client Education</Label>
            <Textarea
              placeholder="e.g. Recheck in 7 days…"
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              className="min-h-[70px] resize-y text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setForm(blank); onClose(); }}>Cancel</Button>
          <Button
            onClick={() => { if (!form.label.trim()) return; onSave(form); setForm(blank); }}
            disabled={!form.label.trim()}
          >
            Add Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export function MedicalSettings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<Record<string, string>>({ queryKey: ["/api/clinic-settings"] });

  // If clinic has never saved templates, we fall back to showing the defaults as editable
  const savedTemplates = parseTemplates(settings);
  const templates: PlanTemplate[] = savedTemplates ?? DEFAULT_PLAN_TEMPLATES;
  const isUsingDefaults = savedTemplates === null;

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlanTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Persist the whole list to clinic-settings
  const saveMutation = useMutation({
    mutationFn: async (updated: PlanTemplate[]) => {
      await apiRequest("PATCH", "/api/clinic-settings", {
        key: TEMPLATES_SETTING_KEY,
        value: JSON.stringify(updated),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinic-settings"] });
      toast({ title: "Templates saved" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSaveEdit = (updated: PlanTemplate) => {
    const next = templates.map((t) => (t.id === updated.id ? updated : t));
    saveMutation.mutate(next);
    setEditTarget(null);
  };

  const handleAdd = (form: Omit<PlanTemplate, "id">) => {
    const newId = templates.length > 0 ? Math.max(...templates.map((t) => t.id)) + 1 : 1;
    saveMutation.mutate([...templates, { ...form, id: newId }]);
    setAddOpen(false);
  };

  const handleDelete = (id: number) => {
    saveMutation.mutate(templates.filter((t) => t.id !== id));
    setDeleteId(null);
  };

  const handleResetToDefaults = () => {
    saveMutation.mutate(DEFAULT_PLAN_TEMPLATES);
    setResetConfirmOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex flex-col gap-0.5">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Treatment Plan Templates
                {isUsingDefaults && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-normal">Built-in defaults</span>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                These templates appear in the "📋 Use Template" dropdown during consultations. Edit, delete, or add your own.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setResetConfirmOpen(true)}
                className="flex items-center gap-1.5 text-muted-foreground"
                title="Reset all templates to built-in defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Defaults
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)} className="flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Add Template
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 p-3 rounded-md border bg-muted/20 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{t.label}</p>
                  {t.procedures && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      <span className="font-medium">Procedures:</span> {t.procedures}
                    </p>
                  )}
                  {t.medications && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      <span className="font-medium">Medications:</span> {t.medications}
                    </p>
                  )}
                  {t.instructions && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      <span className="font-medium">Instructions:</span> {t.instructions}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    size="icon" variant="ghost" className="w-7 h-7"
                    onClick={() => setEditTarget({ ...t })}
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="ghost"
                    className="w-7 h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(t.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editTarget && (
        <TemplateFormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          initial={editTarget}
          onSave={handleSaveEdit}
        />
      )}

      {/* Add Dialog */}
      <AddTemplateDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
      />

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the template. You can restore all defaults using "Reset to Defaults".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset to Defaults Confirm */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Built-in Defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all current templates with the 6 built-in defaults. Any custom templates or edits you've made will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetToDefaults}>
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
