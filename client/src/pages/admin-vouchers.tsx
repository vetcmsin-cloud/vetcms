import { useState, useEffect } from "react";
import { Ticket, ArrowLeft, Save, Loader2, RefreshCcw, Database } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface VoucherConfig {
  type: string;
  label: string;
  prefixKey: string;
  numberKey: string;
  defaultPrefix: string;
}

const voucherConfigs: VoucherConfig[] = [
  { type: "sales_invoice", label: "Sales Invoice", prefixKey: "sales_invoice_prefix", numberKey: "next_invoice_number", defaultPrefix: "#PET-" },
  { type: "purchase_invoice", label: "Purchase Invoice", prefixKey: "purchase_invoice_prefix", numberKey: "next_purchase_number", defaultPrefix: "PUR-" },
  { type: "purchase_order", label: "Purchase Order", prefixKey: "purchase_order_prefix", numberKey: "next_purchase_order_number", defaultPrefix: "PO-" },
  { type: "estimate", label: "Estimate", prefixKey: "estimate_prefix", numberKey: "next_estimate_number", defaultPrefix: "EST-" },
  { type: "lab_report", label: "Lab Report", prefixKey: "lab_report_prefix", numberKey: "next_lab_report_number", defaultPrefix: "LAB-" },
];

export default function AdminVouchers() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/clinic-settings"],
  });

  const { data: dbSequences, refetch: refetchSequences, isFetching: isFetchingSequences } = useQuery<Record<string, number>>({
    queryKey: ["/api/admin/voucher-sequences"],
  });

  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) {
      const initial: Record<string, string> = { ...settings };
      voucherConfigs.forEach(config => {
        if (!initial[config.prefixKey]) initial[config.prefixKey] = config.defaultPrefix;
        if (!initial[config.numberKey]) initial[config.numberKey] = "1";
      });
      setLocalSettings(initial);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const res = await apiRequest("PATCH", "/api/clinic-settings", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinic-settings"] });
      toast({ title: "Settings Updated", description: "Voucher configurations have been saved successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const handleSave = () => {
    updateMutation.mutate(localSettings);
  };

  const loadFromCurrent = () => {
    if (!dbSequences) return;
    const updated = { ...localSettings };
    Object.entries(dbSequences).forEach(([key, value]) => {
      updated[key] = String(value);
    });
    setLocalSettings(updated);
    toast({ title: "Sequences Loaded", description: "Current database numbers have been populated." });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Ticket className="w-6 h-6 text-primary" /> Voucher Management
            </h1>
            <p className="text-sm text-muted-foreground">Configure custom prefixes and sequences for document serialization.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadFromCurrent} 
            disabled={isFetchingSequences || !dbSequences}
            className="rounded-xl font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            {isFetchingSequences ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
            Load From Current
          </Button>
          <Button 
            disabled={updateMutation.isPending || isLoading} 
            onClick={handleSave}
            className="rounded-xl px-6 font-bold shadow-lg shadow-primary/20"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-xl bg-gradient-to-br from-white to-slate-50/50">
          <CardHeader>
            <CardTitle className="text-lg">Document Sequence Rules</CardTitle>
            <CardDescription>
              Define both the static prefix and the next numeric value in the series.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-bold text-slate-800">Document Type</TableHead>
                  <TableHead className="font-bold text-slate-800 w-[200px]">Prefix</TableHead>
                  <TableHead className="font-bold text-slate-800 w-[200px]">Next Number</TableHead>
                  <TableHead className="text-right font-bold text-slate-800">Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voucherConfigs.map((config) => (
                  <TableRow key={config.type} className="border-slate-50 group transition-colors hover:bg-slate-50/50">
                    <TableCell className="font-semibold">{config.label}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <Input 
                           value={localSettings[config.prefixKey] || ""} 
                           onChange={(e) => setLocalSettings(prev => ({ ...prev, [config.prefixKey]: e.target.value }))}
                           className="font-mono font-bold bg-white border-slate-200 focus:ring-primary/20 h-10 rounded-lg"
                           placeholder="Prefix"
                         />
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => setLocalSettings(prev => ({ ...prev, [config.prefixKey]: config.defaultPrefix }))}
                           className="h-10 w-10 text-muted-foreground hover:text-primary"
                         >
                           <RefreshCcw className="w-3.5 h-3.5" />
                         </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input 
                         type="number"
                         value={localSettings[config.numberKey] || "1"} 
                         onChange={(e) => setLocalSettings(prev => ({ ...prev, [config.numberKey]: e.target.value }))}
                         className="font-mono font-bold bg-white border-slate-200 focus:ring-primary/20 h-10 rounded-lg"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="bg-slate-100/50 px-3 py-1.5 rounded-lg border border-slate-200/50 inline-block min-w-[120px]">
                        <span className="font-mono text-xs font-black text-slate-800">
                          {localSettings[config.prefixKey]}
                          {String(localSettings[config.numberKey] || "1").padStart(4, "0")}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-slate-900 text-slate-400">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <Ticket className="w-12 h-12 mb-4 opacity-20 text-white" />
            <h3 className="text-lg font-bold text-white mb-2 underline decoration-primary decoration-4 underline-offset-4">Sequence Syncing</h3>
            <p className="text-sm max-w-md mx-auto leading-relaxed">
              Use "Load From Current" to automatically detect the latest document number in your database and set the "Next Number" to follow it seamlessly.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
