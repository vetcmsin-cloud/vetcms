import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Upload, CheckCircle2, AlertCircle } from "lucide-react";

interface InventoryImportProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImportResult {
  message: string;
  imported: number;
  updated: number;
  errors: string[];
}

export default function InventoryImport({ isOpen, onClose }: InventoryImportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/inventory/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Import failed");
      }

      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-units"] });
      toast({
        title: "Import complete",
        description: `Successfully imported ${data.imported} and updated ${data.updated} items.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = () => {
    if (file) {
      importMutation.mutate(file);
    }
  };

  const downloadTemplate = () => {
    window.location.href = `/api/inventory/export?t=${Date.now()}`;
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Inventory</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx) to bulk import or update inventory items. 
            Items will be matched by SKU.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between gap-4 p-3 border rounded-md bg-muted/50">
            <div className="text-sm">
              <p className="font-medium">Need a template?</p>
              <p className="text-xs text-muted-foreground">Download current inventory as a starting point.</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
          </div>

          <div className="grid gap-2">
            <Input
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              disabled={importMutation.isPending}
            />
            <p className="text-[10px] text-muted-foreground px-1">
              Supported format: .xlsx only.
            </p>
          </div>

          {result && (
            <div className="p-4 border rounded-md bg-secondary/20 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Import Summary
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Items:</span>
                  <span className="font-bold">{result.imported}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-bold">{result.updated}</span>
                </div>
              </div>
              
              {result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-destructive">
                    <AlertCircle className="w-3 h-3" />
                    Errors ({result.errors.length})
                  </div>
                  <div className="max-h-24 overflow-y-auto text-[10px] text-destructive/80 space-y-1 bg-destructive/5 p-2 rounded">
                    {result.errors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!file || importMutation.isPending}
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Start Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
