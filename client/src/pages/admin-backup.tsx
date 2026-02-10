import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Database, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function AdminBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const { toast } = useToast();

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
      toast({ title: "Export Complete", description: "Backup file has been downloaded." });
    } catch {
      toast({ title: "Export Failed", description: "Could not export data. Please try again.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
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
          <h1 className="text-2xl font-bold tracking-tight">Backup Data</h1>
          <p className="text-sm text-muted-foreground">Export all clinic data for safekeeping.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Full Data Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Download a complete backup of your clinic data including owners, patients, appointments,
            medical records, fee structures, invoices, and role configurations.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              data-testid="button-export-backup"
            >
              <Download className="w-4 h-4 mr-1" />
              {isExporting ? "Exporting..." : "Download Backup"}
            </Button>
            {lastExport && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle className="w-3 h-3 text-chart-2" />
                Last exported: {lastExport}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground">
            The backup file is in JSON format and contains all your clinic data. 
            Store it safely for disaster recovery. The file does not include user passwords for security.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
