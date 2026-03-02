import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Download,
  Database,
  ArrowLeft,
  CheckCircle,
  Upload,
  AlertTriangle,
  FileJson,
  Shield,
  Loader2,
  FileCode,
} from "lucide-react";
import { Link } from "wouter";

// Helper to safely parse JSON response, with fallback for non-JSON
async function safeParseResponse(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // Server returned non-JSON (e.g. HTML error page)
    throw new Error(text.substring(0, 300) || `Server error (HTTP ${res.status})`);
  }
}

export default function AdminBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingSql, setIsExportingSql] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestoringSql, setIsRestoringSql] = useState(false);
  const [backupFile, setBackupFile] = useState<any>(null);
  const [backupFileName, setBackupFileName] = useState<string>("");
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showSqlRestoreConfirm, setShowSqlRestoreConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [sqlConfirmText, setSqlConfirmText] = useState("");
  const [restoreResult, setRestoreResult] = useState<any>(null);
  const [sqlRestoreResult, setSqlRestoreResult] = useState<any>(null);
  const [sqlFile, setSqlFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sqlFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // JSON Export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/backup/export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `petpoint-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setLastExport(new Date().toLocaleString());
      toast({ title: "Export Complete", description: "JSON backup file has been downloaded." });
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message || "Could not export data.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // SQL Export
  const handleExportSql = async () => {
    setIsExportingSql(true);
    try {
      const res = await fetch("/api/backup/export-sql", { credentials: "include" });
      if (!res.ok) {
        const result = await safeParseResponse(res);
        throw new Error(result.message || "Export failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `petpoint-backup-${new Date().toISOString().split("T")[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setLastExport(new Date().toLocaleString());
      toast({ title: "SQL Export Complete", description: "SQL backup file has been downloaded." });
    } catch (err: any) {
      toast({ title: "SQL Export Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsExportingSql(false);
    }
  };

  // JSON file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupFileName(file.name);
    setRestoreResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let text = event.target?.result as string;
        if (!text) {
          toast({ title: "Empty File", description: "The selected file appears to be empty.", variant: "destructive" });
          setBackupFile(null);
          return;
        }
        // Strip BOM if present
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.substring(1);
        }
        text = text.trim();
        const parsed = JSON.parse(text);
        if (!parsed.data) {
          toast({ title: "Invalid File", description: "This does not appear to be a valid PetPoint backup file.", variant: "destructive" });
          setBackupFile(null);
          return;
        }
        setBackupFile(parsed);
      } catch (err: any) {
        toast({ title: "Invalid JSON", description: `Could not parse the backup file: ${err.message}`, variant: "destructive" });
        setBackupFile(null);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  // SQL file upload
  const handleSqlFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSqlFile(file);
    setSqlRestoreResult(null);
  };

  // JSON Restore
  const handleRestore = async () => {
    if (!backupFile) return;
    setIsRestoring(true);
    setShowRestoreConfirm(false);
    setConfirmText("");

    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(backupFile),
      });

      const result = await safeParseResponse(res);
      if (!res.ok) throw new Error(result.message || "Restore failed");

      setRestoreResult(result);
      queryClient.invalidateQueries();
      toast({ title: "Restore Complete", description: result.message });
    } catch (err: any) {
      toast({ title: "Restore Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRestoring(false);
    }
  };

  // SQL Restore
  const handleSqlRestore = async () => {
    if (!sqlFile) return;
    setIsRestoringSql(true);
    setShowSqlRestoreConfirm(false);
    setSqlConfirmText("");

    try {
      const formData = new FormData();
      formData.append("file", sqlFile);

      const res = await fetch("/api/backup/restore-sql", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await safeParseResponse(res);
      if (!res.ok) throw new Error(result.message || "SQL Restore failed");

      setSqlRestoreResult(result);
      queryClient.invalidateQueries();
      toast({ title: "SQL Restore Complete", description: result.message });
    } catch (err: any) {
      toast({ title: "SQL Restore Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRestoringSql(false);
    }
  };

  const getBackupStats = () => {
    if (!backupFile?.data) return [];
    const d = backupFile.data;
    return [
      { label: "Owners", count: d.owners?.length || 0 },
      { label: "Pets", count: d.pets?.length || 0 },
      { label: "Appointments", count: d.appointments?.length || 0 },
      { label: "Medical Records", count: d.medicalRecords?.length || 0 },
      { label: "Invoices", count: d.invoices?.length || 0 },
      { label: "Lab Reports", count: d.labReports?.length || 0 },
      { label: "Fee Structures", count: d.feeStructures?.length || 0 },
      { label: "Inventory Items", count: d.inventoryItems?.length || 0 },
      { label: "Expenses", count: d.expenses?.length || 0 },
      { label: "Suppliers", count: d.suppliers?.length || 0 },
      { label: "Purchase Orders", count: d.purchaseOrders?.length || 0 },
      { label: "Clinic Settings", count: d.clinicSettings ? Object.keys(d.clinicSettings).length : 0 },
      { label: "Roles", count: d.roles?.length || 0 },
    ].filter(s => s.count > 0);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto" data-testid="page-admin-backup">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button size="icon" variant="ghost" data-testid="button-back-admin">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Backup & Restore</h1>
          <p className="text-sm text-muted-foreground">Export and restore clinic data for safekeeping.</p>
        </div>
      </div>

      {/* ═══════ DOWNLOAD BACKUPS ═══════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            Download Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download a complete backup of your clinic data. Choose your preferred format.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* SQL Download */}
            <div className="border rounded-lg p-4 space-y-3 bg-emerald-50/50 border-emerald-200">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold">SQL Backup</span>
                <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Native PostgreSQL dump. Most reliable for full database backup & restore.
              </p>
              <Button
                onClick={handleExportSql}
                disabled={isExportingSql}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-export-sql"
              >
                {isExportingSql ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                {isExportingSql ? "Exporting..." : "Download .sql"}
              </Button>
            </div>

            {/* JSON Download */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold">JSON Backup</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Portable JSON format. Good for data migration or manual inspection.
              </p>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                variant="outline"
                className="w-full"
                data-testid="button-export-json"
              >
                {isExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                {isExporting ? "Exporting..." : "Download .json"}
              </Button>
            </div>
          </div>

          {lastExport && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle className="w-3 h-3 text-chart-2" />
              Last exported: {lastExport}
            </span>
          )}
        </CardContent>
      </Card>

      {/* ═══════ RESTORE SQL BACKUP ═══════ */}
      <Card className="border-emerald-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-600" />
            Restore SQL Backup
            <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Super Admin</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-md bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Restoring an SQL backup will <strong>replace all existing data</strong> with the backup data.
              This is a full database restore. Make sure to download a backup first!
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sql-file">Select SQL Backup File (.sql)</Label>
            <Input
              ref={sqlFileInputRef}
              id="sql-file"
              type="file"
              accept=".sql"
              onChange={handleSqlFileSelect}
              className="flex-1"
              data-testid="input-sql-file"
            />
          </div>

          {sqlFile && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold">Selected: {sqlFile.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {(sqlFile.size / 1024).toFixed(1)} KB
                </Badge>
              </div>

              <Button
                variant="destructive"
                onClick={() => setShowSqlRestoreConfirm(true)}
                disabled={isRestoringSql}
                className="w-full"
                data-testid="button-restore-sql"
              >
                {isRestoringSql ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-1" />
                    Restore SQL Backup
                  </>
                )}
              </Button>
            </div>
          )}

          {sqlRestoreResult && (
            <div className="border rounded-lg p-4 bg-emerald-50 border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">{sqlRestoreResult.message}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════ RESTORE JSON BACKUP ═══════ */}
      <Card className="border-blue-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileJson className="w-4 h-4 text-blue-600" />
            Restore JSON Backup
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Super Admin</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-md bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Restoring a JSON backup will <strong>replace all existing data</strong> with the backup data.
              User accounts and passwords will NOT be affected. This cannot be undone.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="backup-file">Select JSON Backup File (.json)</Label>
            <Input
              ref={fileInputRef}
              id="backup-file"
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="flex-1"
              data-testid="input-backup-file"
            />
          </div>

          {backupFile && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Backup Preview</span>
                <Badge variant="secondary" className="text-[10px]">v{backupFile.version || "1.0"}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-muted-foreground">File:</span>
                <span className="font-medium truncate">{backupFileName}</span>
                <span className="text-muted-foreground">Export Date:</span>
                <span className="font-medium">
                  {backupFile.exportDate
                    ? new Date(backupFile.exportDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                    : "Unknown"}
                </span>
              </div>

              <div className="border-t pt-2">
                <span className="text-xs font-semibold text-muted-foreground mb-1 block">Records in backup:</span>
                <div className="flex flex-wrap gap-1.5">
                  {getBackupStats().map(s => (
                    <Badge key={s.label} variant="outline" className="text-[10px] font-normal">
                      {s.label}: <strong className="ml-0.5">{s.count}</strong>
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={() => setShowRestoreConfirm(true)}
                disabled={isRestoring}
                className="w-full"
                data-testid="button-restore-json"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-1" />
                    Restore JSON Backup
                  </>
                )}
              </Button>
            </div>
          )}

          {restoreResult && (
            <div className="border rounded-lg p-4 bg-emerald-50 border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-semibold">{restoreResult.message}</span>
              </div>
              {restoreResult.counts && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(restoreResult.counts).map(([key, val]) => (
                    <Badge key={key} variant="outline" className="text-[10px] font-normal border-emerald-300 text-emerald-700">
                      {key}: <strong className="ml-0.5">{val as number}</strong>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground">
            <strong>SQL Backup</strong> is recommended — it's a native PostgreSQL dump that preserves all data perfectly.
            <strong> JSON Backup</strong> is useful for data migration or inspection.
            Always download a backup before restoring. User accounts and passwords are never affected by restore operations.
          </p>
        </CardContent>
      </Card>

      {/* ═══════ JSON RESTORE CONFIRM DIALOG ═══════ */}
      <Dialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirm JSON Restore
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-start gap-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                This will erase ALL current clinic data and replace it with the backup data.
                User accounts will NOT be affected. This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-restore" className="text-sm">
                Type <span className="font-mono font-bold">RESTORE</span> to confirm
              </Label>
              <Input
                id="confirm-restore"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESTORE"
                data-testid="input-confirm-restore"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowRestoreConfirm(false); setConfirmText(""); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={confirmText !== "RESTORE" || isRestoring}
                onClick={handleRestore}
                data-testid="button-confirm-json-restore"
              >
                {isRestoring ? "Restoring..." : "Restore Data"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════ SQL RESTORE CONFIRM DIALOG ═══════ */}
      <Dialog open={showSqlRestoreConfirm} onOpenChange={setShowSqlRestoreConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirm SQL Restore
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-start gap-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                This will run the SQL backup against your database, replacing ALL existing data.
                This is a full database restore. This action cannot be undone.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-sql-restore" className="text-sm">
                Type <span className="font-mono font-bold">RESTORE</span> to confirm
              </Label>
              <Input
                id="confirm-sql-restore"
                value={sqlConfirmText}
                onChange={(e) => setSqlConfirmText(e.target.value)}
                placeholder="RESTORE"
                data-testid="input-confirm-sql-restore"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowSqlRestoreConfirm(false); setSqlConfirmText(""); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={sqlConfirmText !== "RESTORE" || isRestoringSql}
                onClick={handleSqlRestore}
                data-testid="button-confirm-sql-restore"
              >
                {isRestoringSql ? "Restoring..." : "Restore SQL Data"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
