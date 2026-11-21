import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Banknote, Building2, CalendarClock, Check, Clock3, CreditCard, LogOut, Plus, Receipt, RefreshCw, Search, ShieldAlert, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Clinic = {
  id: number;
  name: string;
  slug: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  status: "active" | "suspended";
  plan: string;
  isDemo: boolean;
  demoUntil: string | null;
  validUntil: string | null;
  createdAt: string;
  userCount: number;
  patientCount: number;
};

type ClinicDraft = {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  status: "active" | "suspended";
  plan: string;
  isDemo: boolean;
  demoUntil: string;
  validUntil: string;
};

type ClinicPayment = {
  id: number;
  amount: string;
  currency: string;
  method: string;
  status: string;
  paymentDate: string;
  reference: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  notes: string | null;
};

type PaymentDraft = {
  amount: string;
  currency: string;
  method: string;
  status: string;
  paymentDate: string;
  reference: string;
  periodStart: string;
  periodEnd: string;
  validUntil: string;
  notes: string;
};

type ClinicAdmin = { id: number; name: string; email: string; phone: string; role: string };

function dateInput(value: string | null | undefined): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function draftFrom(clinic: Clinic): ClinicDraft {
  return {
    name: clinic.name,
    contactName: clinic.contactName || "",
    contactEmail: clinic.contactEmail || "",
    contactPhone: clinic.contactPhone || "",
    address: clinic.address || "",
    status: clinic.status,
    plan: clinic.plan,
    isDemo: clinic.isDemo,
    demoUntil: dateInput(clinic.demoUntil),
    validUntil: dateInput(clinic.validUntil),
  };
}

function blankPaymentDraft(): PaymentDraft {
  return {
    amount: "", currency: "INR", method: "bank_transfer", status: "paid",
    paymentDate: new Date().toISOString().slice(0, 10), reference: "",
    periodStart: "", periodEnd: "", validUntil: "", notes: "",
  };
}

function clinicIsExpired(clinic: Clinic): boolean {
  return Boolean(
    (clinic.validUntil && new Date(clinic.validUntil).getTime() < Date.now()) ||
    (clinic.isDemo && clinic.demoUntil && new Date(clinic.demoUntil).getTime() < Date.now()),
  );
}

export default function PlatformAdmin() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<number, ClinicDraft>>({});
  const [expandedClinicId, setExpandedClinicId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [clinicSearch, setClinicSearch] = useState("");
  const [clinicStatusFilter, setClinicStatusFilter] = useState("all");
  const [createDraft, setCreateDraft] = useState({
    name: "", adminName: "", adminEmail: "", adminPassword: "", contactEmail: "", contactPhone: "", address: "",
    plan: "demo", status: "active", isDemo: true,
    demoUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), validUntil: "",
  });
  const [paymentClinicId, setPaymentClinicId] = useState<number | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>(blankPaymentDraft());
  const [adminClinicId, setAdminClinicId] = useState<number | null>(null);
  const [adminDraft, setAdminDraft] = useState({ name: "", email: "", phone: "", password: "" });
  const [deleteClinicId, setDeleteClinicId] = useState<number | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const clinicsQuery = useQuery<Clinic[]>({
    queryKey: ["/api/platform/clinics"],
    queryFn: async () => {
      const response = await fetch("/api/platform/clinics", { credentials: "include", cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Could not load clinics");
      return body;
    },
  });

  useEffect(() => {
    if (clinicsQuery.data) {
      setDrafts(Object.fromEntries(clinicsQuery.data.map((clinic) => [clinic.id, draftFrom(clinic)])));
    }
  }, [clinicsQuery.data]);

  const saveClinic = useMutation({
    mutationFn: async ({ id, draft }: { id: number; draft: ClinicDraft }) => {
      const response = await apiRequest("PATCH", `/api/platform/clinics/${id}`, {
        ...draft,
        demoUntil: draft.demoUntil || null,
        validUntil: draft.validUntil || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Clinic updated", description: "Access and subscription settings were saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/clinics"] });
    },
    onError: (error: Error) => toast({ title: "Could not update clinic", description: error.message, variant: "destructive" }),
  });

  const deleteClinic = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/platform/clinics/${id}`);
      return response.json();
    },
    onSuccess: (_result, id) => {
      const clinic = clinicsQuery.data?.find((item) => item.id === id);
      toast({ title: "Clinic deleted", description: `${clinic?.name || "The clinic"} and its clinic data were deleted.` });
      setDeleteClinicId(null);
      setDeleteConfirmName("");
      setExpandedClinicId((current) => current === id ? null : current);
      setAdminClinicId((current) => current === id ? null : current);
      setPaymentClinicId((current) => current === id ? null : current);
      queryClient.invalidateQueries({ queryKey: ["/api/platform/clinics"] });
    },
    onError: (error: Error) => toast({ title: "Could not delete clinic", description: error.message, variant: "destructive" }),
  });

  const createClinic = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/platform/clinics", {
        ...createDraft,
        demoUntil: createDraft.demoUntil || null,
        validUntil: createDraft.validUntil || null,
      });
      return response.json();
    },
    onSuccess: (result) => {
      toast({ title: "Clinic created", description: `Admin account created for ${result.admin.email}.` });
      setShowCreateForm(false);
      setCreateDraft({ name: "", adminName: "", adminEmail: "", adminPassword: "", contactEmail: "", contactPhone: "", address: "", plan: "demo", status: "active", isDemo: true, demoUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), validUntil: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/clinics"] });
    },
    onError: (error: Error) => toast({ title: "Could not create clinic", description: error.message, variant: "destructive" }),
  });

  const paymentsQuery = useQuery<ClinicPayment[]>({
    queryKey: ["/api/platform/clinics", paymentClinicId, "payments"],
    enabled: paymentClinicId !== null,
    queryFn: async () => {
      const response = await fetch(`/api/platform/clinics/${paymentClinicId}/payments`, { credentials: "include", cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Could not load payment history");
      return body;
    },
  });

  const adminsQuery = useQuery<ClinicAdmin[]>({
    queryKey: ["/api/platform/clinics", adminClinicId, "admins"],
    enabled: adminClinicId !== null,
    queryFn: async () => {
      const response = await fetch(`/api/platform/clinics/${adminClinicId}/admins`, { credentials: "include", cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Could not load clinic admins");
      return body;
    },
  });

  const createClinicAdmin = useMutation({
    mutationFn: async () => {
      if (!adminClinicId) throw new Error("Select a clinic first");
      const response = await apiRequest("POST", `/api/platform/clinics/${adminClinicId}/admins`, adminDraft);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Clinic admin created", description: "The new account can now sign in to this clinic." });
      setAdminDraft({ name: "", email: "", phone: "", password: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/clinics", adminClinicId, "admins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/clinics"] });
    },
    onError: (error: Error) => toast({ title: "Could not create clinic admin", description: error.message, variant: "destructive" }),
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!paymentClinicId) throw new Error("Select a clinic first");
      const response = await apiRequest("POST", `/api/platform/clinics/${paymentClinicId}/payments`, {
        ...paymentDraft,
        periodStart: paymentDraft.periodStart || null,
        periodEnd: paymentDraft.periodEnd || null,
        validUntil: paymentDraft.validUntil || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Payment recorded", description: "The clinic payment was added to its history." });
      setPaymentDraft(blankPaymentDraft());
      queryClient.invalidateQueries({ queryKey: ["/api/platform/clinics", paymentClinicId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/clinics"] });
    },
    onError: (error: Error) => toast({ title: "Could not record payment", description: error.message, variant: "destructive" }),
  });

  const clinics = clinicsQuery.data || [];
  const deleteTarget = clinics.find((clinic) => clinic.id === deleteClinicId) || null;
  const visibleClinics = clinics.filter((clinic) => {
    const query = clinicSearch.trim().toLowerCase();
    const matchesText = !query || [clinic.name, clinic.slug, clinic.contactEmail, clinic.contactPhone].some((value) => value?.toLowerCase().includes(query));
    const matchesStatus = clinicStatusFilter === "all" || (clinicStatusFilter === "demo" ? clinic.isDemo : clinicStatusFilter === "expired" ? clinicIsExpired(clinic) : clinic.status === clinicStatusFilter);
    return matchesText && matchesStatus;
  });
  const summary = useMemo(() => ({
    active: clinics.filter((clinic) => clinic.status === "active" && !clinicIsExpired(clinic)).length,
    suspended: clinics.filter((clinic) => clinic.status === "suspended").length,
    demos: clinics.filter((clinic) => clinic.isDemo).length,
    expired: clinics.filter((clinic) => clinic.status !== "active" || clinicIsExpired(clinic)).length,
    totalUsers: clinics.reduce((sum, clinic) => sum + clinic.userCount, 0),
  }), [clinics]);

  const edit = <K extends keyof ClinicDraft>(id: number, key: K, value: ClinicDraft[K]) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  };
  const selectedClinic = clinics.find((clinic) => clinic.id === paymentClinicId) || null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><Building2 className="h-5 w-5" /></div>
            <div>
              <h1 className="text-lg font-semibold">Platform administration</h1>
              <p className="text-xs text-muted-foreground">Manage clinic accounts, demos, and access validity</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-7">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard title="Total clinics" value={clinics.length} icon={<Building2 className="h-4 w-4" />} />
          <SummaryCard title="Active clinics" value={summary.active} icon={<Check className="h-4 w-4" />} />
          <SummaryCard title="Demo accounts" value={summary.demos} icon={<Clock3 className="h-4 w-4" />} />
          <SummaryCard title="Inactive or expired" value={summary.expired} icon={<ShieldAlert className="h-4 w-4" />} />
          <SummaryCard title="Clinic users" value={summary.totalUsers} icon={<Users className="h-4 w-4" />} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Clinics</h2>
            <p className="text-sm text-muted-foreground">Register clinics and their first admin, manage access, validity, and payment history.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => clinicsQuery.refetch()} disabled={clinicsQuery.isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${clinicsQuery.isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button onClick={() => setShowCreateForm((open) => !open)}><Plus className="mr-2 h-4 w-4" /> New clinic</Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search clinics" placeholder="Search by clinic, email, phone, or slug" value={clinicSearch} onChange={(event) => setClinicSearch(event.target.value)} className="pl-9" /></div>
          <select aria-label="Filter clinics" value={clinicStatusFilter} onChange={(event) => setClinicStatusFilter(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm sm:w-52"><option value="all">All clinics</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="demo">Demo</option><option value="expired">Expired</option></select>
          <span className="self-center px-2 text-sm text-muted-foreground">{visibleClinics.length} of {clinics.length} clinics</span>
        </div>

        {showCreateForm && (
          <Card>
            <CardHeader><CardTitle className="text-base">Register a clinic and its first administrator</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5"><Label>Clinic name</Label><Input value={createDraft.name} onChange={(event) => setCreateDraft((current) => ({ ...current, name: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Clinic admin name</Label><Input value={createDraft.adminName} onChange={(event) => setCreateDraft((current) => ({ ...current, adminName: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Clinic admin email</Label><Input type="email" value={createDraft.adminEmail} onChange={(event) => setCreateDraft((current) => ({ ...current, adminEmail: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Temporary password</Label><Input type="password" minLength={8} value={createDraft.adminPassword} onChange={(event) => setCreateDraft((current) => ({ ...current, adminPassword: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Contact email</Label><Input type="email" value={createDraft.contactEmail} onChange={(event) => setCreateDraft((current) => ({ ...current, contactEmail: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Contact phone</Label><Input value={createDraft.contactPhone} onChange={(event) => setCreateDraft((current) => ({ ...current, contactPhone: event.target.value }))} /></div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3"><Label>Clinic address</Label><Input value={createDraft.address} onChange={(event) => setCreateDraft((current) => ({ ...current, address: event.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Plan</Label><select value={createDraft.plan} onChange={(event) => setCreateDraft((current) => ({ ...current, plan: event.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="demo">Demo</option><option value="standard">Standard</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select></div>
              <div className="space-y-1.5"><Label>Access status</Label><select value={createDraft.status} onChange={(event) => setCreateDraft((current) => ({ ...current, status: event.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="active">Active</option><option value="suspended">Suspended</option></select></div>
              <div className="flex items-center gap-2 pt-7"><input id="new-clinic-demo" type="checkbox" checked={createDraft.isDemo} onChange={(event) => setCreateDraft((current) => ({ ...current, isDemo: event.target.checked }))} className="h-4 w-4 rounded border" /><Label htmlFor="new-clinic-demo">Demo account</Label></div>
              {createDraft.isDemo && <div className="space-y-1.5"><Label>Demo ends</Label><Input type="date" value={createDraft.demoUntil} onChange={(event) => setCreateDraft((current) => ({ ...current, demoUntil: event.target.value }))} /></div>}
              <div className="space-y-1.5"><Label>Access valid until</Label><Input type="date" value={createDraft.validUntil} onChange={(event) => setCreateDraft((current) => ({ ...current, validUntil: event.target.value }))} /></div>
              <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-3">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                <Button onClick={() => createClinic.mutate()} disabled={createClinic.isPending || !createDraft.name.trim() || !createDraft.adminName.trim() || !createDraft.adminEmail.trim() || createDraft.adminPassword.length < 8}>{createClinic.isPending ? "Creating clinic…" : "Create clinic and admin"}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {clinicsQuery.isError && <Card><CardContent className="p-5 text-sm text-destructive">{(clinicsQuery.error as Error).message}</CardContent></Card>}
        {clinicsQuery.isLoading && <Card><CardContent className="p-5 text-sm text-muted-foreground">Loading clinic accounts…</CardContent></Card>}
        {!clinicsQuery.isLoading && clinics.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No clinics have registered yet.</CardContent></Card>}
        {!clinicsQuery.isLoading && clinics.length > 0 && visibleClinics.length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No clinics match these filters.</CardContent></Card>}

        <div className="grid gap-4">
          {visibleClinics.map((clinic) => {
            const draft = drafts[clinic.id] || draftFrom(clinic);
            const saving = saveClinic.isPending && saveClinic.variables?.id === clinic.id;
            const expired = clinicIsExpired(clinic);
            return (
              <Card key={clinic.id} className="overflow-hidden">
                <CardHeader className="border-b bg-background pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{clinic.name}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">Clinic #{clinic.id} · {clinic.slug}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" aria-expanded={expandedClinicId === clinic.id} onClick={() => setExpandedClinicId((current) => current === clinic.id ? null : clinic.id)}>{expandedClinicId === clinic.id ? "Close details" : "Manage"}</Button>
                      <Button variant="outline" size="sm" onClick={() => { setAdminClinicId(clinic.id); setAdminDraft({ name: "", email: "", phone: "", password: "" }); }}><Users className="mr-2 h-4 w-4" /> Admin accounts</Button>
                      <Button variant="outline" size="sm" onClick={() => { setPaymentClinicId(clinic.id); setPaymentDraft(blankPaymentDraft()); }}><CreditCard className="mr-2 h-4 w-4" /> Payments</Button>
                      <Button variant="destructive" size="sm" onClick={() => { setDeleteClinicId(clinic.id); setDeleteConfirmName(""); }}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                      <Badge variant={clinic.status === "active" ? "default" : "destructive"}>{clinic.status}</Badge>
                      {clinic.isDemo && <Badge variant="secondary">Demo</Badge>}
                      {expired && <Badge variant="destructive">Expired</Badge>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {clinic.userCount} users</span>
                    <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {clinic.patientCount} patients</span>
                    <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Created {new Date(clinic.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardHeader>
                <CardContent className={expandedClinicId === clinic.id ? "grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3" : "p-5"}>
                  {expandedClinicId === clinic.id ? <>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <Label htmlFor={`clinic-name-${clinic.id}`}>Clinic name</Label>
                    <Input id={`clinic-name-${clinic.id}`} value={draft.name} onChange={(event) => edit(clinic.id, "name", event.target.value)} />
                  </div>
                  <div className="space-y-1.5"><Label htmlFor={`clinic-contact-name-${clinic.id}`}>Contact name</Label><Input id={`clinic-contact-name-${clinic.id}`} value={draft.contactName} onChange={(event) => edit(clinic.id, "contactName", event.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor={`clinic-contact-email-${clinic.id}`}>Contact email</Label><Input id={`clinic-contact-email-${clinic.id}`} type="email" value={draft.contactEmail} onChange={(event) => edit(clinic.id, "contactEmail", event.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor={`clinic-contact-phone-${clinic.id}`}>Contact phone</Label><Input id={`clinic-contact-phone-${clinic.id}`} value={draft.contactPhone} onChange={(event) => edit(clinic.id, "contactPhone", event.target.value)} /></div>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3"><Label htmlFor={`clinic-address-${clinic.id}`}>Address</Label><Input id={`clinic-address-${clinic.id}`} value={draft.address} onChange={(event) => edit(clinic.id, "address", event.target.value)} /></div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`clinic-status-${clinic.id}`}>Access status</Label>
                    <select id={`clinic-status-${clinic.id}`} value={draft.status} onChange={(event) => edit(clinic.id, "status", event.target.value as ClinicDraft["status"])} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`clinic-plan-${clinic.id}`}>Plan</Label>
                    <select id={`clinic-plan-${clinic.id}`} value={draft.plan} onChange={(event) => edit(clinic.id, "plan", event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                      <option value="demo">Demo</option>
                      <option value="standard">Standard</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
                    <input type="checkbox" checked={draft.isDemo} onChange={(event) => edit(clinic.id, "isDemo", event.target.checked)} className="h-4 w-4 rounded border" />
                    This clinic is using a demo period
                  </label>
                  <div className="space-y-1.5">
                    <Label htmlFor={`clinic-demo-until-${clinic.id}`}>Demo ends</Label>
                    <Input id={`clinic-demo-until-${clinic.id}`} type="date" value={draft.demoUntil} onChange={(event) => edit(clinic.id, "demoUntil", event.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`clinic-valid-until-${clinic.id}`}>Access valid until</Label>
                    <Input id={`clinic-valid-until-${clinic.id}`} type="date" value={draft.validUntil} onChange={(event) => edit(clinic.id, "validUntil", event.target.value)} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 sm:col-span-2 lg:col-span-3">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ShieldAlert className="h-3.5 w-3.5" /> Changes apply immediately to clinic access</span>
                    <Button onClick={() => saveClinic.mutate({ id: clinic.id, draft })} disabled={saving || !draft.name.trim()}>
                      {saving ? "Saving…" : "Save clinic"}
                    </Button>
                  </div>
                  </> : <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><p className="text-xs text-muted-foreground">Clinic contact</p><p className="mt-1 font-medium">{clinic.contactName || "—"}</p><p className="text-xs text-muted-foreground">{clinic.contactEmail || "No contact email"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Phone and address</p><p className="mt-1 font-medium">{clinic.contactPhone || "No phone"}</p><p className="truncate text-xs text-muted-foreground">{clinic.address || "No address"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Subscription</p><p className="mt-1 font-medium capitalize">{clinic.plan}</p><p className="text-xs text-muted-foreground">{clinic.isDemo ? `Demo until ${dateInput(clinic.demoUntil) || "not set"}` : `Valid until ${dateInput(clinic.validUntil) || "not set"}`}</p></div>
                    <div><p className="text-xs text-muted-foreground">Usage</p><p className="mt-1 font-medium">{clinic.userCount} users · {clinic.patientCount} patients</p><p className="text-xs text-muted-foreground">Created {new Date(clinic.createdAt).toLocaleDateString()}</p></div>
                  </div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <Dialog open={deleteClinicId !== null} onOpenChange={(open) => { if (!open && !deleteClinic.isPending) { setDeleteClinicId(null); setDeleteConfirmName(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name || "clinic"}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the clinic, its users, patients, appointments, medical records, and payment history. Type the clinic name to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-clinic-confirm">Clinic name</Label>
            <Input id="delete-clinic-confirm" autoComplete="off" value={deleteConfirmName} onChange={(event) => setDeleteConfirmName(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteClinicId(null); setDeleteConfirmName(""); }} disabled={deleteClinic.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteClinic.mutate(deleteTarget.id)} disabled={!deleteTarget || deleteConfirmName.trim() !== deleteTarget.name || deleteClinic.isPending}>
              {deleteClinic.isPending ? "Deleting clinic…" : "Delete clinic and data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentClinicId !== null} onOpenChange={(open) => { if (!open) setPaymentClinicId(null); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payments {selectedClinic ? `· ${selectedClinic.name}` : ""}</DialogTitle>
            <DialogDescription>Record manual payment details and maintain this clinic’s billing history. A paid entry can extend access when a validity date is supplied.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5"><Label>Amount</Label><Input type="number" min="0.01" step="0.01" value={paymentDraft.amount} onChange={(event) => setPaymentDraft((current) => ({ ...current, amount: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Currency</Label><Input maxLength={3} value={paymentDraft.currency} onChange={(event) => setPaymentDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} /></div>
            <div className="space-y-1.5"><Label>Method</Label><select value={paymentDraft.method} onChange={(event) => setPaymentDraft((current) => ({ ...current, method: event.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="bank_transfer">Bank transfer</option><option value="upi">UPI</option><option value="card">Card</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="online">Online</option><option value="other">Other</option></select></div>
            <div className="space-y-1.5"><Label>Payment status</Label><select value={paymentDraft.status} onChange={(event) => setPaymentDraft((current) => ({ ...current, status: event.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select></div>
            <div className="space-y-1.5"><Label>Payment date</Label><Input type="date" value={paymentDraft.paymentDate} onChange={(event) => setPaymentDraft((current) => ({ ...current, paymentDate: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Reference / receipt no.</Label><Input value={paymentDraft.reference} onChange={(event) => setPaymentDraft((current) => ({ ...current, reference: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Billing period start</Label><Input type="date" value={paymentDraft.periodStart} onChange={(event) => setPaymentDraft((current) => ({ ...current, periodStart: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Billing period end</Label><Input type="date" value={paymentDraft.periodEnd} onChange={(event) => setPaymentDraft((current) => ({ ...current, periodEnd: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Extend access until</Label><Input type="date" value={paymentDraft.validUntil} onChange={(event) => setPaymentDraft((current) => ({ ...current, validUntil: event.target.value }))} /></div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3"><Label>Notes</Label><Input value={paymentDraft.notes} onChange={(event) => setPaymentDraft((current) => ({ ...current, notes: event.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={() => recordPayment.mutate()} disabled={recordPayment.isPending || !paymentDraft.amount || Number(paymentDraft.amount) <= 0}>{recordPayment.isPending ? "Recording…" : "Record payment"}</Button></DialogFooter>
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-medium">Payment history</h3>
            {paymentsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading history…</p>}
            {paymentsQuery.isError && <p className="text-sm text-destructive">{(paymentsQuery.error as Error).message}</p>}
            {!paymentsQuery.isLoading && !paymentsQuery.isError && (paymentsQuery.data || []).length === 0 && <p className="text-sm text-muted-foreground">No payments recorded.</p>}
            {(paymentsQuery.data || []).map((payment) => (
              <div key={payment.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border p-3 text-sm">
                <div><div className="flex items-center gap-2 font-medium"><Banknote className="h-4 w-4" />{payment.currency} {Number(payment.amount).toLocaleString()} <Badge variant={payment.status === "paid" ? "default" : "secondary"}>{payment.status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{payment.method.replaceAll("_", " ")} · {new Date(payment.paymentDate).toLocaleDateString()}{payment.reference ? ` · Ref ${payment.reference}` : ""}</p>{(payment.periodStart || payment.periodEnd) && <p className="mt-1 text-xs text-muted-foreground">Billing period: {payment.periodStart ? dateInput(payment.periodStart) : "—"} to {payment.periodEnd ? dateInput(payment.periodEnd) : "—"}</p>}{payment.notes && <p className="mt-1 text-xs text-muted-foreground">{payment.notes}</p>}</div>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adminClinicId !== null} onOpenChange={(open) => { if (!open) setAdminClinicId(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Clinic administrator accounts {clinics.find((clinic) => clinic.id === adminClinicId) ? `· ${clinics.find((clinic) => clinic.id === adminClinicId)?.name}` : ""}</DialogTitle>
            <DialogDescription>Manage administrator access for this clinic. Each email must be unique across the platform.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Name</Label><Input value={adminDraft.name} onChange={(event) => setAdminDraft((current) => ({ ...current, name: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={adminDraft.email} onChange={(event) => setAdminDraft((current) => ({ ...current, email: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={adminDraft.phone} onChange={(event) => setAdminDraft((current) => ({ ...current, phone: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Initial password</Label><Input type="password" minLength={8} value={adminDraft.password} onChange={(event) => setAdminDraft((current) => ({ ...current, password: event.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={() => createClinicAdmin.mutate()} disabled={createClinicAdmin.isPending || adminDraft.name.trim().length < 2 || !adminDraft.email.trim() || adminDraft.password.length < 8}>{createClinicAdmin.isPending ? "Creating…" : "Create clinic admin"}</Button></DialogFooter>
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-medium">Current administrators</h3>
            {adminsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading administrator accounts…</p>}
            {adminsQuery.isError && <p className="text-sm text-destructive">{(adminsQuery.error as Error).message}</p>}
            {!adminsQuery.isLoading && !adminsQuery.isError && (adminsQuery.data || []).length === 0 && <p className="text-sm text-muted-foreground">No administrator accounts found.</p>}
            {(adminsQuery.data || []).map((admin) => <div key={admin.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"><div className="font-medium">{admin.name}<p className="font-normal text-xs text-muted-foreground">{admin.email}{admin.phone ? ` · ${admin.phone}` : ""}</p></div><Badge>Clinic admin</Badge></div>)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div><p className="text-sm text-muted-foreground">{title}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}
