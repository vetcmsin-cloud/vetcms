import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Printer, Building2, ImageIcon, Save, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

type ClinicSettings = Record<string, string>;

const PRINTER_TYPES = [
  { value: "thermal_58mm", label: "Thermal 58mm", description: "Small thermal receipt printer (58mm width)" },
  { value: "thermal_80mm", label: "Thermal 80mm", description: "Standard thermal receipt printer (80mm width)" },
  { value: "a5", label: "A5 Half Page", description: "A5 paper size (148 x 210 mm)" },
  { value: "a4", label: "A4 Full Page", description: "Standard A4 paper size (210 x 297 mm)" },
];

export default function AdminSettings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<ClinicSettings>({
    queryKey: ["/api/clinic-settings"],
  });

  const [printerType, setPrinterType] = useState("a4");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [footerText, setFooterText] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  const [loginBackgroundUrl, setLoginBackgroundUrl] = useState("");
  const [loginBackgroundColor, setLoginBackgroundColor] = useState("");

  useEffect(() => {
    if (settings) {
      setPrinterType(settings.printerType || "a4");
      setClinicName(settings.clinicName || "");
      setClinicAddress(settings.clinicAddress || "");
      setClinicPhone(settings.clinicPhone || "");
      setClinicEmail(settings.clinicEmail || "");
      setGstNumber(settings.gstNumber || "");
      setRegistrationNumber(settings.registrationNumber || "");
      setFooterText(settings.footerText || "");
      setTermsConditions(settings.termsConditions || "");
      setLoginBackgroundUrl(settings.loginBackgroundUrl || "");
      setLoginBackgroundColor(settings.loginBackgroundColor || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("PATCH", "/api/clinic-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinic-settings"] });
      toast({ title: "Settings saved", description: "Your settings have been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveInvoiceDesign = () => {
    saveMutation.mutate({ printerType });
  };

  const saveClinicInfo = () => {
    saveMutation.mutate({
      clinicName,
      clinicAddress,
      clinicPhone,
      clinicEmail,
      gstNumber,
      registrationNumber,
      footerText,
      termsConditions,
    });
  };

  const saveLoginBackground = () => {
    saveMutation.mutate({
      loginBackgroundUrl,
      loginBackgroundColor,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto" data-testid="page-admin-settings">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto" data-testid="page-admin-settings">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button size="icon" variant="ghost" data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Clinic Settings
          </h1>
        </div>
        <p className="text-sm text-muted-foreground ml-[72px]">
          Configure invoice design, clinic information, and login appearance.
        </p>
      </div>

      <Card data-testid="card-invoice-design">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 flex-shrink-0">
            <Printer className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">Invoice Design</CardTitle>
            <p className="text-xs text-muted-foreground">Choose the printer type for invoice printing layout.</p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Printer Type</Label>
            <Select value={printerType} onValueChange={setPrinterType}>
              <SelectTrigger data-testid="select-printer-type">
                <SelectValue placeholder="Select printer type" />
              </SelectTrigger>
              <SelectContent>
                {PRINTER_TYPES.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>
                    {pt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {PRINTER_TYPES.find((pt) => pt.value === printerType)?.description}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRINTER_TYPES.map((pt) => (
              <div
                key={pt.value}
                className={`flex flex-col items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors ${
                  printerType === pt.value
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
                onClick={() => setPrinterType(pt.value)}
                data-testid={`option-printer-${pt.value}`}
              >
                <div
                  className={`border rounded-sm bg-background ${
                    pt.value.startsWith("thermal") ? "w-6 h-10" : pt.value === "a5" ? "w-8 h-10" : "w-10 h-12"
                  }`}
                />
                <span className="text-xs font-medium text-center">{pt.label}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={saveInvoiceDesign}
              disabled={saveMutation.isPending}
              data-testid="button-save-invoice-design"
            >
              <Save className="w-4 h-4 mr-1" />
              {saveMutation.isPending ? "Saving..." : "Save Design"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-clinic-info">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 flex-shrink-0">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">Clinic Information</CardTitle>
            <p className="text-xs text-muted-foreground">Details shown on invoices and bills.</p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="setting-clinic-name">Clinic Name</Label>
              <Input
                id="setting-clinic-name"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Enter clinic name"
                data-testid="input-clinic-name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="setting-clinic-phone">Phone Number</Label>
              <Input
                id="setting-clinic-phone"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                placeholder="Enter phone number"
                data-testid="input-clinic-phone"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="setting-clinic-address">Address</Label>
            <Textarea
              id="setting-clinic-address"
              value={clinicAddress}
              onChange={(e) => setClinicAddress(e.target.value)}
              placeholder="Enter clinic address"
              rows={2}
              data-testid="input-clinic-address"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="setting-clinic-email">Email</Label>
              <Input
                id="setting-clinic-email"
                type="email"
                value={clinicEmail}
                onChange={(e) => setClinicEmail(e.target.value)}
                placeholder="clinic@example.com"
                data-testid="input-clinic-email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="setting-gst">GST / Tax Number</Label>
              <Input
                id="setting-gst"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="Enter GST number"
                data-testid="input-gst-number"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="setting-reg">Registration Number</Label>
            <Input
              id="setting-reg"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="Enter registration number (optional)"
              data-testid="input-registration-number"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="setting-footer">Invoice Footer Text</Label>
            <Textarea
              id="setting-footer"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Thank you message or footer text"
              rows={2}
              data-testid="input-footer-text"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="setting-terms">Terms & Conditions</Label>
            <Textarea
              id="setting-terms"
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              placeholder="Payment terms, refund policy, etc. (optional)"
              rows={3}
              data-testid="input-terms-conditions"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={saveClinicInfo}
              disabled={saveMutation.isPending}
              data-testid="button-save-clinic-info"
            >
              <Save className="w-4 h-4 mr-1" />
              {saveMutation.isPending ? "Saving..." : "Save Clinic Info"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-login-background">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 flex-shrink-0">
            <ImageIcon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">Login Screen Background</CardTitle>
            <p className="text-xs text-muted-foreground">Customize the login page appearance.</p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="setting-login-bg-url">Background Image URL</Label>
            <Input
              id="setting-login-bg-url"
              value={loginBackgroundUrl}
              onChange={(e) => setLoginBackgroundUrl(e.target.value)}
              placeholder="https://example.com/background.jpg"
              data-testid="input-login-bg-url"
            />
            <p className="text-xs text-muted-foreground">
              Paste a URL to an image. Leave empty to use the default background.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="setting-login-bg-color">Background Color (fallback)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="setting-login-bg-color"
                value={loginBackgroundColor}
                onChange={(e) => setLoginBackgroundColor(e.target.value)}
                placeholder="#1a1a2e or rgb(26,26,46)"
                className="flex-1"
                data-testid="input-login-bg-color"
              />
              {loginBackgroundColor && (
                <div
                  className="w-9 h-9 rounded-md border flex-shrink-0"
                  style={{ backgroundColor: loginBackgroundColor }}
                  data-testid="preview-login-bg-color"
                />
              )}
            </div>
          </div>

          {loginBackgroundUrl && (
            <div className="flex flex-col gap-1.5">
              <Label>Preview</Label>
              <div
                className="w-full h-40 rounded-md border bg-cover bg-center bg-no-repeat relative overflow-hidden"
                style={{ backgroundImage: `url(${loginBackgroundUrl})` }}
                data-testid="preview-login-bg-image"
              >
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="bg-background/90 rounded-md p-4 text-center">
                    <p className="text-sm font-medium">Login Form Preview</p>
                    <p className="text-xs text-muted-foreground">Your login form will appear here</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={saveLoginBackground}
              disabled={saveMutation.isPending}
              data-testid="button-save-login-bg"
            >
              <Save className="w-4 h-4 mr-1" />
              {saveMutation.isPending ? "Saving..." : "Save Background"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
