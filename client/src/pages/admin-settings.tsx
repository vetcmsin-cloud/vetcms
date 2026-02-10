import { useState, useEffect, useRef } from "react";
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
import { Settings, Printer, Building2, ImageIcon, Save, ArrowLeft, Palette, QrCode, Upload, X, Loader2 } from "lucide-react";
import { Link } from "wouter";

type ClinicSettings = Record<string, string>;

const PRINTER_TYPES = [
  { value: "thermal_58mm", label: "Thermal 58mm", description: "Small thermal receipt printer (58mm width)" },
  { value: "thermal_80mm", label: "Thermal 80mm", description: "Standard thermal receipt printer (80mm width)" },
  { value: "a5", label: "A5 Half Page", description: "A5 paper size (148 x 210 mm)" },
  { value: "a4", label: "A4 Full Page", description: "Standard A4 paper size (210 x 297 mm)" },
];

const FONT_OPTIONS = [
  { value: "default", label: "Default (System)" },
  { value: "serif", label: "Serif (Times)" },
  { value: "mono", label: "Monospace" },
];

function ImageUploader({
  label,
  currentUrl,
  onUploaded,
  onRemoved,
  testIdPrefix,
  settingKey,
}: {
  label: string;
  currentUrl: string;
  onUploaded: (url: string) => void;
  onRemoved: () => void;
  testIdPrefix: string;
  settingKey?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      onUploaded(data.url);
      if (settingKey) {
        await fetch("/api/clinic-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [settingKey]: data.url }),
          credentials: "include",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/clinic-settings"] });
      }
      toast({ title: "Uploaded", description: `${label} uploaded and saved.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (currentUrl && currentUrl.startsWith("/uploads/")) {
      const filename = currentUrl.split("/uploads/")[1];
      try {
        await fetch(`/api/upload/${filename}`, { method: "DELETE", credentials: "include" });
      } catch {}
    }
    onRemoved();
    if (settingKey) {
      await fetch("/api/clinic-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [settingKey]: "" }),
        credentials: "include",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clinic-settings"] });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {currentUrl ? (
        <div className="flex items-start gap-3">
          <img
            src={currentUrl}
            alt={label}
            className="w-24 h-24 rounded-md border object-cover"
            data-testid={`${testIdPrefix}-preview`}
          />
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground break-all max-w-xs">{currentUrl}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                data-testid={`${testIdPrefix}-change`}
              >
                {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                Change
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemove}
                data-testid={`${testIdPrefix}-remove`}
              >
                <X className="w-3 h-3 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-md cursor-pointer hover-elevate"
          onClick={() => fileRef.current?.click()}
          data-testid={`${testIdPrefix}-dropzone`}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="w-6 h-6 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {uploading ? "Uploading..." : "Click to upload image"}
          </p>
          <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP (max 5 MB)</p>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
        data-testid={`${testIdPrefix}-input`}
      />
    </div>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<ClinicSettings>({
    queryKey: ["/api/clinic-settings"],
  });

  const [printerType, setPrinterType] = useState("a4");
  const [invoiceHeaderColor, setInvoiceHeaderColor] = useState("#0f766e");
  const [invoiceAccentColor, setInvoiceAccentColor] = useState("#0d9488");
  const [invoiceFontFamily, setInvoiceFontFamily] = useState("default");
  const [clinicLogoUrl, setClinicLogoUrl] = useState("");
  const [invoiceHeaderTextColor, setInvoiceHeaderTextColor] = useState("#ffffff");

  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [footerText, setFooterText] = useState("");
  const [termsConditions, setTermsConditions] = useState("");

  const [upiId, setUpiId] = useState("");
  const [upiBankName, setUpiBankName] = useState("");
  const [upiPayeeName, setUpiPayeeName] = useState("");

  const [loginBackgroundUrl, setLoginBackgroundUrl] = useState("");
  const [loginBackgroundColor, setLoginBackgroundColor] = useState("");

  useEffect(() => {
    if (settings) {
      setPrinterType(settings.printerType || "a4");
      setInvoiceHeaderColor(settings.invoiceHeaderColor || "#0f766e");
      setInvoiceAccentColor(settings.invoiceAccentColor || "#0d9488");
      setInvoiceFontFamily(settings.invoiceFontFamily || "default");
      setClinicLogoUrl(settings.clinicLogoUrl || "");
      setInvoiceHeaderTextColor(settings.invoiceHeaderTextColor || "#ffffff");
      setClinicName(settings.clinicName || "");
      setClinicAddress(settings.clinicAddress || "");
      setClinicPhone(settings.clinicPhone || "");
      setClinicEmail(settings.clinicEmail || "");
      setGstNumber(settings.gstNumber || "");
      setRegistrationNumber(settings.registrationNumber || "");
      setFooterText(settings.footerText || "");
      setTermsConditions(settings.termsConditions || "");
      setUpiId(settings.upiId || "");
      setUpiBankName(settings.upiBankName || "");
      setUpiPayeeName(settings.upiPayeeName || "");
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
    saveMutation.mutate({
      printerType,
      invoiceHeaderColor,
      invoiceAccentColor,
      invoiceFontFamily,
      clinicLogoUrl,
      invoiceHeaderTextColor,
    });
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

  const saveUpiSettings = () => {
    saveMutation.mutate({
      upiId,
      upiBankName,
      upiPayeeName,
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
          Configure invoice design, clinic information, UPI payments, and login appearance.
        </p>
      </div>

      <Card data-testid="card-invoice-design">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 flex-shrink-0">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">Invoice Design</CardTitle>
            <p className="text-xs text-muted-foreground">Customize the look and layout of your invoices.</p>
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

          <div className="border-t pt-4 mt-2">
            <p className="text-sm font-medium mb-3">Colors & Styling</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setting-header-color">Header Background</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="setting-header-color"
                    value={invoiceHeaderColor}
                    onChange={(e) => setInvoiceHeaderColor(e.target.value)}
                    className="w-9 h-9 rounded-md border cursor-pointer flex-shrink-0"
                    data-testid="input-header-color"
                  />
                  <Input
                    value={invoiceHeaderColor}
                    onChange={(e) => setInvoiceHeaderColor(e.target.value)}
                    className="flex-1"
                    data-testid="input-header-color-text"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setting-header-text-color">Header Text Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="setting-header-text-color"
                    value={invoiceHeaderTextColor}
                    onChange={(e) => setInvoiceHeaderTextColor(e.target.value)}
                    className="w-9 h-9 rounded-md border cursor-pointer flex-shrink-0"
                    data-testid="input-header-text-color"
                  />
                  <Input
                    value={invoiceHeaderTextColor}
                    onChange={(e) => setInvoiceHeaderTextColor(e.target.value)}
                    className="flex-1"
                    data-testid="input-header-text-color-text"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setting-accent-color">Accent / Table Header</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="setting-accent-color"
                    value={invoiceAccentColor}
                    onChange={(e) => setInvoiceAccentColor(e.target.value)}
                    className="w-9 h-9 rounded-md border cursor-pointer flex-shrink-0"
                    data-testid="input-accent-color"
                  />
                  <Input
                    value={invoiceAccentColor}
                    onChange={(e) => setInvoiceAccentColor(e.target.value)}
                    className="flex-1"
                    data-testid="input-accent-color-text"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Font Style</Label>
              <Select value={invoiceFontFamily} onValueChange={setInvoiceFontFamily}>
                <SelectTrigger data-testid="select-font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ImageUploader
              label="Clinic Logo"
              currentUrl={clinicLogoUrl}
              onUploaded={(url) => setClinicLogoUrl(url)}
              onRemoved={() => setClinicLogoUrl("")}
              testIdPrefix="upload-clinic-logo"
              settingKey="clinicLogoUrl"
            />
          </div>

          <div className="border rounded-md p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div
              className="rounded-md p-3"
              style={{ backgroundColor: invoiceHeaderColor, color: invoiceHeaderTextColor }}
              data-testid="preview-invoice-header"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-bold text-sm">{clinicName || "Your Clinic Name"}</p>
                  <p className="text-xs opacity-80">{clinicAddress || "Clinic Address"}</p>
                </div>
                <p className="text-lg font-bold opacity-90">INVOICE</p>
              </div>
            </div>
            <div
              className="rounded-md p-2 mt-1 text-xs font-medium"
              style={{ backgroundColor: invoiceAccentColor, color: invoiceHeaderTextColor }}
            >
              <div className="flex justify-between gap-2">
                <span>Description of Services</span>
                <span>Qty</span>
                <span>Price</span>
                <span>Total</span>
              </div>
            </div>
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

      <Card data-testid="card-upi-settings">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 flex-shrink-0">
            <QrCode className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">UPI Payment Settings</CardTitle>
            <p className="text-xs text-muted-foreground">Configure UPI details for payment QR codes on invoices.</p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="setting-upi-id">UPI ID</Label>
              <Input
                id="setting-upi-id"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@upi"
                data-testid="input-upi-id"
              />
              <p className="text-xs text-muted-foreground">Your UPI address for receiving payments.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="setting-upi-bank">Bank Name</Label>
              <Input
                id="setting-upi-bank"
                value={upiBankName}
                onChange={(e) => setUpiBankName(e.target.value)}
                placeholder="e.g., ICICI Bank"
                data-testid="input-upi-bank-name"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="setting-upi-payee">Payee Name</Label>
            <Input
              id="setting-upi-payee"
              value={upiPayeeName}
              onChange={(e) => setUpiPayeeName(e.target.value)}
              placeholder="Clinic or business name for UPI"
              data-testid="input-upi-payee-name"
            />
            <p className="text-xs text-muted-foreground">The name shown to the payer when scanning the QR code.</p>
          </div>

          {upiId && (
            <div className="border rounded-md p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Payment QR codes will appear on invoices</p>
              <p className="text-xs font-mono break-all">
                upi://pay?pa={upiId}&pn={encodeURIComponent(upiPayeeName || clinicName || "Clinic")}&cu=INR
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={saveUpiSettings}
              disabled={saveMutation.isPending}
              data-testid="button-save-upi"
            >
              <Save className="w-4 h-4 mr-1" />
              {saveMutation.isPending ? "Saving..." : "Save UPI Settings"}
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
          <ImageUploader
            label="Background Image"
            currentUrl={loginBackgroundUrl}
            onUploaded={(url) => setLoginBackgroundUrl(url)}
            onRemoved={() => setLoginBackgroundUrl("")}
            testIdPrefix="upload-login-bg"
            settingKey="loginBackgroundUrl"
          />

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
            <p className="text-xs text-muted-foreground">
              Used when no background image is set.
            </p>
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
