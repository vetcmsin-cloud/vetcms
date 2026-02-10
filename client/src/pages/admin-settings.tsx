import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Settings, Printer, Building2, ImageIcon, Save, ArrowLeft,
  Palette, QrCode, Upload, X, Loader2, Eye, Type, LayoutGrid,
  ToggleLeft, Columns3, PanelTop,
} from "lucide-react";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";

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

const LOGO_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const LOGO_POSITION_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const TABLE_STYLE_OPTIONS = [
  { value: "striped", label: "Striped Rows" },
  { value: "bordered", label: "All Borders" },
  { value: "minimal", label: "Minimal" },
];

function getFontFamily(fontSetting: string) {
  switch (fontSetting) {
    case "serif": return "'Times New Roman', 'Georgia', serif";
    case "mono": return "'Courier New', 'Consolas', monospace";
    default: return "system-ui, -apple-system, sans-serif";
  }
}

function getLogoSizePx(size: string) {
  switch (size) {
    case "small": return 36;
    case "large": return 72;
    default: return 48;
  }
}

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `\u20B9${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

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
            className="w-20 h-20 rounded-md border object-cover"
            data-testid={`${testIdPrefix}-preview`}
          />
          <div className="flex flex-col gap-1.5">
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
          className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer hover-elevate"
          onClick={() => fileRef.current?.click()}
          data-testid={`${testIdPrefix}-dropzone`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-muted-foreground" />
          )}
          <p className="text-xs text-muted-foreground">
            {uploading ? "Uploading..." : "Click to upload"}
          </p>
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

function SettingToggle({
  label,
  description,
  checked,
  onCheckedChange,
  testId,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} data-testid={testId} />
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-md border cursor-pointer flex-shrink-0"
          data-testid={`${testId}-picker`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
          data-testid={`${testId}-text`}
        />
      </div>
    </div>
  );
}

const SAMPLE_ITEMS = [
  { id: 1, description: "General Consultation", quantity: 1, unitPrice: "500.00", total: "500.00" },
  { id: 2, description: "Vaccination - Rabies", quantity: 1, unitPrice: "800.00", total: "800.00" },
  { id: 3, description: "Blood Test (CBC)", quantity: 1, unitPrice: "350.00", total: "350.00" },
];

function InvoicePreview({
  headerColor,
  headerTextColor,
  accentColor,
  fontFamily,
  clinicLogoUrl,
  logoSize,
  logoPosition,
  clinicName,
  clinicAddress,
  clinicPhone,
  clinicEmail,
  gstNumber,
  registrationNumber,
  footerText,
  termsConditions,
  upiId,
  upiPayeeName,
  invoiceTitle,
  showGst,
  showRegNumber,
  showClinicPhone,
  showClinicEmail,
  showTerms,
  showNotes,
  showFooter,
  showUpiQr,
  showPatientInfo,
  showDueDate,
  tableStyle,
  colDescription,
  colQuantity,
  colPrice,
  colTotal,
  totalBgMatchHeader,
}: {
  headerColor: string;
  headerTextColor: string;
  accentColor: string;
  fontFamily: string;
  clinicLogoUrl: string;
  logoSize: string;
  logoPosition: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  gstNumber: string;
  registrationNumber: string;
  footerText: string;
  termsConditions: string;
  upiId: string;
  upiPayeeName: string;
  invoiceTitle: string;
  showGst: boolean;
  showRegNumber: boolean;
  showClinicPhone: boolean;
  showClinicEmail: boolean;
  showTerms: boolean;
  showNotes: boolean;
  showFooter: boolean;
  showUpiQr: boolean;
  showPatientInfo: boolean;
  showDueDate: boolean;
  tableStyle: string;
  colDescription: string;
  colQuantity: string;
  colPrice: string;
  colTotal: string;
  totalBgMatchHeader: boolean;
}) {
  const logoPx = getLogoSizePx(logoSize);
  const subtotal = 1650;
  const tax = 297;
  const total = 1947;

  const upiUrl = upiId
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiPayeeName || clinicName || "Clinic")}&am=${total.toFixed(2)}&cu=INR`
    : "";

  const getRowClass = (idx: number) => {
    if (tableStyle === "striped") return idx % 2 === 0 ? "bg-muted/20" : "";
    if (tableStyle === "bordered") return "border-b";
    return "";
  };

  const tableBorderClass = tableStyle === "bordered" ? "border" : tableStyle === "minimal" ? "" : "border";

  const logoElement = clinicLogoUrl ? (
    <img
      src={clinicLogoUrl}
      alt="Clinic Logo"
      className="rounded-md object-contain bg-white/20 p-1"
      style={{ width: logoPx, height: logoPx }}
      data-testid="preview-logo"
    />
  ) : null;

  return (
    <div
      className="rounded-md overflow-hidden border bg-background"
      style={{ fontFamily, fontSize: "12px" }}
      data-testid="invoice-live-preview"
    >
      <div
        className="p-5"
        style={{ backgroundColor: headerColor, color: headerTextColor }}
      >
        {logoPosition === "center" ? (
          <div className="flex flex-col items-center gap-2 text-center">
            {logoElement}
            <div>
              <p className="font-bold text-base">{clinicName || "Your Clinic Name"}</p>
              {clinicAddress && <p className="text-[11px] opacity-85 mt-0.5">{clinicAddress}</p>}
              <div className="flex items-center gap-3 justify-center mt-1 flex-wrap">
                {showClinicPhone && clinicPhone && <span className="text-[10px] opacity-75">{clinicPhone}</span>}
                {showClinicEmail && clinicEmail && <span className="text-[10px] opacity-75">{clinicEmail}</span>}
              </div>
            </div>
            <p className="text-lg font-bold tracking-wide opacity-90 mt-1">{invoiceTitle}</p>
            <div className="flex items-center gap-3 justify-center flex-wrap">
              {showGst && gstNumber && <span className="text-[10px] opacity-70">GST: {gstNumber}</span>}
              {showRegNumber && registrationNumber && <span className="text-[10px] opacity-70">Reg: {registrationNumber}</span>}
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className={`flex items-start gap-3 ${logoPosition === "right" ? "order-2" : ""}`}>
              {logoPosition === "left" && logoElement}
              <div>
                <p className="font-bold text-base">{clinicName || "Your Clinic Name"}</p>
                {clinicAddress && <p className="text-[11px] opacity-85 mt-0.5">{clinicAddress}</p>}
                <div className="flex flex-col gap-0.5 mt-1">
                  {showClinicPhone && clinicPhone && <span className="text-[10px] opacity-75">{clinicPhone}</span>}
                  {showClinicEmail && clinicEmail && <span className="text-[10px] opacity-75">{clinicEmail}</span>}
                </div>
              </div>
            </div>
            <div className={`${logoPosition === "right" ? "order-1" : "text-right"}`}>
              <div className={`flex items-start gap-3 ${logoPosition === "right" ? "" : "justify-end"}`}>
                <div>
                  <p className="text-lg font-bold tracking-wide opacity-90">{invoiceTitle}</p>
                  {showGst && gstNumber && <p className="text-[10px] opacity-70 mt-1">GST: {gstNumber}</p>}
                  {showRegNumber && registrationNumber && <p className="text-[10px] opacity-70">Reg: {registrationNumber}</p>}
                </div>
                {logoPosition === "right" && logoElement}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex justify-between gap-4 mb-4 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bill To</p>
            <p className="font-semibold text-sm">Rahul Sharma</p>
            <p className="text-[11px] text-muted-foreground">123 MG Road, Bengaluru</p>
            <p className="text-[11px] text-muted-foreground">+91 98765 43210</p>
            {showPatientInfo && (
              <p className="text-[11px] mt-0.5">
                <span className="text-muted-foreground">Patient:</span>{" "}
                <span className="font-medium">Bruno</span>{" "}
                <span className="text-muted-foreground">(Dog - Labrador)</span>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 text-right">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date</p>
              <p className="font-medium text-sm">10/02/2026</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Invoice Number</p>
              <p className="font-semibold text-sm" style={{ color: headerColor }}>#PET-0042</p>
            </div>
            {showDueDate && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Due Date</p>
                <p className="font-medium text-sm">17/02/2026</p>
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-md overflow-hidden ${tableBorderClass} mb-4`}>
          <table className="w-full text-[11px]" data-testid="preview-table">
            <thead>
              <tr style={{ backgroundColor: accentColor, color: headerTextColor }}>
                <th className="text-left p-2.5 font-semibold">{colDescription}</th>
                <th className="text-center p-2.5 font-semibold w-12">{colQuantity}</th>
                <th className="text-right p-2.5 font-semibold w-20">{colPrice}</th>
                <th className="text-right p-2.5 font-semibold w-20">{colTotal}</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_ITEMS.map((item, idx) => (
                <tr key={item.id} className={getRowClass(idx)}>
                  <td className={`p-2.5 ${tableStyle === "bordered" ? "border-r" : ""}`}>{item.description}</td>
                  <td className={`text-center p-2.5 ${tableStyle === "bordered" ? "border-r" : ""}`}>{item.quantity}</td>
                  <td className={`text-right p-2.5 ${tableStyle === "bordered" ? "border-r" : ""}`}>{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right p-2.5 font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-4">
          <div className="w-full max-w-[200px]">
            <div className="flex justify-between gap-3 py-1">
              <span className="text-[11px] text-muted-foreground">Subtotal</span>
              <span className="text-[11px] font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between gap-3 py-1">
              <span className="text-[11px] text-muted-foreground">Tax (18%)</span>
              <span className="text-[11px] font-medium">{formatCurrency(tax)}</span>
            </div>
            <div
              className="flex justify-between gap-3 py-1.5 mt-1 rounded-md px-2 -mx-2"
              style={totalBgMatchHeader
                ? { backgroundColor: headerColor, color: headerTextColor }
                : { backgroundColor: accentColor, color: headerTextColor }
              }
            >
              <span className="font-bold text-[12px]">Total</span>
              <span className="font-bold text-sm">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {showNotes && (
          <div className="mb-3 p-2.5 rounded-md bg-muted/30">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Notes</p>
            <p className="text-[11px]">Follow-up vaccination scheduled in 3 weeks. Give prescribed medication twice daily.</p>
          </div>
        )}

        <div className="border-t pt-3 mt-2">
          <div className="flex justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Payment Information</p>
                {clinicAddress && <p className="text-[10px] text-muted-foreground">{clinicAddress}</p>}
                {showClinicPhone && clinicPhone && <p className="text-[10px] text-muted-foreground">{clinicPhone}</p>}
                {showClinicEmail && clinicEmail && <p className="text-[10px] text-muted-foreground">{clinicEmail}</p>}
              </div>
              {upiId && (
                <div className="mt-0.5">
                  <p className="text-[10px] text-muted-foreground">
                    <span className="font-medium">UPI:</span> {upiId}
                  </p>
                </div>
              )}
              {showTerms && termsConditions && (
                <div className="mt-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Terms & Conditions</p>
                  <p className="text-[10px] text-muted-foreground whitespace-pre-line">{termsConditions}</p>
                </div>
              )}
            </div>

            {showUpiQr && upiId && (
              <div className="flex flex-col items-center gap-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Scan to Pay</p>
                <div className="p-1.5 bg-white rounded-md border">
                  <QRCodeSVG value={upiUrl} size={80} level="M" includeMargin={false} />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium" style={{ color: headerColor }}>
                  {formatCurrency(total)}
                </p>
                <p className="text-[9px] text-muted-foreground">{upiPayeeName}</p>
              </div>
            )}
          </div>
        </div>

        {showFooter && footerText && (
          <div className="mt-3 pt-2 border-t text-center">
            <p className="text-[11px] font-medium" style={{ color: headerColor }}>{footerText}</p>
          </div>
        )}
      </div>
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

  const [invoiceTitle, setInvoiceTitle] = useState("INVOICE");
  const [invoiceLogoSize, setInvoiceLogoSize] = useState("medium");
  const [invoiceLogoPosition, setInvoiceLogoPosition] = useState("left");
  const [invoiceTableStyle, setInvoiceTableStyle] = useState("striped");
  const [invoiceTotalBgHeader, setInvoiceTotalBgHeader] = useState("true");

  const [showGst, setShowGst] = useState(true);
  const [showRegNumber, setShowRegNumber] = useState(true);
  const [showClinicPhone, setShowClinicPhone] = useState(true);
  const [showClinicEmail, setShowClinicEmail] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [showUpiQr, setShowUpiQr] = useState(true);
  const [showPatientInfo, setShowPatientInfo] = useState(true);
  const [showDueDate, setShowDueDate] = useState(true);

  const [colDescription, setColDescription] = useState("Description of Services");
  const [colQuantity, setColQuantity] = useState("Qty");
  const [colPrice, setColPrice] = useState("Price");
  const [colTotal, setColTotal] = useState("Total");

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
      setInvoiceTitle(settings.invoiceTitle || "INVOICE");
      setInvoiceLogoSize(settings.invoiceLogoSize || "medium");
      setInvoiceLogoPosition(settings.invoiceLogoPosition || "left");
      setInvoiceTableStyle(settings.invoiceTableStyle || "striped");
      setInvoiceTotalBgHeader(settings.invoiceTotalBgHeader || "true");
      setShowGst(settings.invoiceShowGst !== "false");
      setShowRegNumber(settings.invoiceShowRegNumber !== "false");
      setShowClinicPhone(settings.invoiceShowClinicPhone !== "false");
      setShowClinicEmail(settings.invoiceShowClinicEmail !== "false");
      setShowTerms(settings.invoiceShowTerms !== "false");
      setShowNotes(settings.invoiceShowNotes !== "false");
      setShowFooter(settings.invoiceShowFooter !== "false");
      setShowUpiQr(settings.invoiceShowUpiQr !== "false");
      setShowPatientInfo(settings.invoiceShowPatientInfo !== "false");
      setShowDueDate(settings.invoiceShowDueDate !== "false");
      setColDescription(settings.invoiceColDescription || "Description of Services");
      setColQuantity(settings.invoiceColQuantity || "Qty");
      setColPrice(settings.invoiceColPrice || "Price");
      setColTotal(settings.invoiceColTotal || "Total");
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

  const saveAllInvoiceSettings = () => {
    saveMutation.mutate({
      printerType,
      invoiceHeaderColor,
      invoiceAccentColor,
      invoiceFontFamily,
      clinicLogoUrl,
      invoiceHeaderTextColor,
      invoiceTitle,
      invoiceLogoSize,
      invoiceLogoPosition,
      invoiceTableStyle,
      invoiceTotalBgHeader,
      invoiceShowGst: String(showGst),
      invoiceShowRegNumber: String(showRegNumber),
      invoiceShowClinicPhone: String(showClinicPhone),
      invoiceShowClinicEmail: String(showClinicEmail),
      invoiceShowTerms: String(showTerms),
      invoiceShowNotes: String(showNotes),
      invoiceShowFooter: String(showFooter),
      invoiceShowUpiQr: String(showUpiQr),
      invoiceShowPatientInfo: String(showPatientInfo),
      invoiceShowDueDate: String(showDueDate),
      invoiceColDescription: colDescription,
      invoiceColQuantity: colQuantity,
      invoiceColPrice: colPrice,
      invoiceColTotal: colTotal,
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

  const fontFamily = useMemo(() => getFontFamily(invoiceFontFamily), [invoiceFontFamily]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-admin-settings">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto" data-testid="page-admin-settings">
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
          Design your invoices, manage clinic information, and customize appearance.
        </p>
      </div>

      <Card data-testid="card-invoice-designer">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 flex-shrink-0">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">Invoice Design Studio</CardTitle>
            <p className="text-xs text-muted-foreground">Complete control over your invoice layout, colors, fields, and styling.</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4 min-w-0">
              <Tabs defaultValue="layout" className="w-full">
                <TabsList className="grid w-full grid-cols-5" data-testid="tabs-invoice-design">
                  <TabsTrigger value="layout" data-testid="tab-layout">
                    <LayoutGrid className="w-3.5 h-3.5 mr-1" />
                    <span className="hidden sm:inline">Layout</span>
                  </TabsTrigger>
                  <TabsTrigger value="colors" data-testid="tab-colors">
                    <Palette className="w-3.5 h-3.5 mr-1" />
                    <span className="hidden sm:inline">Colors</span>
                  </TabsTrigger>
                  <TabsTrigger value="fields" data-testid="tab-fields">
                    <ToggleLeft className="w-3.5 h-3.5 mr-1" />
                    <span className="hidden sm:inline">Fields</span>
                  </TabsTrigger>
                  <TabsTrigger value="columns" data-testid="tab-columns">
                    <Columns3 className="w-3.5 h-3.5 mr-1" />
                    <span className="hidden sm:inline">Table</span>
                  </TabsTrigger>
                  <TabsTrigger value="print" data-testid="tab-print">
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    <span className="hidden sm:inline">Print</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="layout" className="flex flex-col gap-4 mt-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="invoice-title">Invoice Title</Label>
                    <Input
                      id="invoice-title"
                      value={invoiceTitle}
                      onChange={(e) => setInvoiceTitle(e.target.value)}
                      placeholder="INVOICE"
                      data-testid="input-invoice-title"
                    />
                    <p className="text-xs text-muted-foreground">The main heading text on the invoice (e.g., INVOICE, TAX INVOICE, RECEIPT).</p>
                  </div>

                  <Separator />

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

                  <Separator />

                  <ImageUploader
                    label="Clinic Logo"
                    currentUrl={clinicLogoUrl}
                    onUploaded={(url) => setClinicLogoUrl(url)}
                    onRemoved={() => setClinicLogoUrl("")}
                    testIdPrefix="upload-clinic-logo"
                    settingKey="clinicLogoUrl"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label>Logo Size</Label>
                      <Select value={invoiceLogoSize} onValueChange={setInvoiceLogoSize}>
                        <SelectTrigger data-testid="select-logo-size">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOGO_SIZE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Logo Position</Label>
                      <Select value={invoiceLogoPosition} onValueChange={setInvoiceLogoPosition}>
                        <SelectTrigger data-testid="select-logo-position">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOGO_POSITION_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-col gap-1.5">
                    <Label>Table Row Style</Label>
                    <Select value={invoiceTableStyle} onValueChange={setInvoiceTableStyle}>
                      <SelectTrigger data-testid="select-table-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TABLE_STYLE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <SettingToggle
                    label="Total bar uses header color"
                    description="When off, the total bar will use the accent color instead."
                    checked={invoiceTotalBgHeader === "true"}
                    onCheckedChange={(v) => setInvoiceTotalBgHeader(String(v))}
                    testId="toggle-total-bg-header"
                  />
                </TabsContent>

                <TabsContent value="colors" className="flex flex-col gap-4 mt-4">
                  <ColorInput
                    label="Header Background"
                    value={invoiceHeaderColor}
                    onChange={setInvoiceHeaderColor}
                    testId="input-header-color"
                  />
                  <ColorInput
                    label="Header Text Color"
                    value={invoiceHeaderTextColor}
                    onChange={setInvoiceHeaderTextColor}
                    testId="input-header-text-color"
                  />
                  <ColorInput
                    label="Accent / Table Header"
                    value={invoiceAccentColor}
                    onChange={setInvoiceAccentColor}
                    testId="input-accent-color"
                  />
                  <div className="rounded-md border p-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2">Color Presets</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { header: "#0f766e", accent: "#0d9488", text: "#ffffff", label: "Teal" },
                        { header: "#1e40af", accent: "#2563eb", text: "#ffffff", label: "Blue" },
                        { header: "#7c3aed", accent: "#8b5cf6", text: "#ffffff", label: "Purple" },
                        { header: "#b91c1c", accent: "#dc2626", text: "#ffffff", label: "Red" },
                        { header: "#c2410c", accent: "#ea580c", text: "#ffffff", label: "Orange" },
                        { header: "#15803d", accent: "#16a34a", text: "#ffffff", label: "Green" },
                        { header: "#1f2937", accent: "#374151", text: "#f9fafb", label: "Dark" },
                        { header: "#78350f", accent: "#92400e", text: "#ffffff", label: "Brown" },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          className="flex flex-col items-center gap-1 p-1.5 rounded-md border hover-elevate"
                          onClick={() => {
                            setInvoiceHeaderColor(preset.header);
                            setInvoiceAccentColor(preset.accent);
                            setInvoiceHeaderTextColor(preset.text);
                          }}
                          data-testid={`preset-${preset.label.toLowerCase()}`}
                        >
                          <div className="flex gap-0.5">
                            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: preset.header }} />
                            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: preset.accent }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="fields" className="flex flex-col gap-1 mt-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Toggle which sections appear on your invoices.
                  </p>
                  <SettingToggle
                    label="GST / Tax Number"
                    description="Show GST number in the invoice header."
                    checked={showGst}
                    onCheckedChange={setShowGst}
                    testId="toggle-show-gst"
                  />
                  <Separator />
                  <SettingToggle
                    label="Registration Number"
                    description="Show clinic registration number."
                    checked={showRegNumber}
                    onCheckedChange={setShowRegNumber}
                    testId="toggle-show-reg"
                  />
                  <Separator />
                  <SettingToggle
                    label="Clinic Phone"
                    description="Show phone number on invoice."
                    checked={showClinicPhone}
                    onCheckedChange={setShowClinicPhone}
                    testId="toggle-show-phone"
                  />
                  <Separator />
                  <SettingToggle
                    label="Clinic Email"
                    description="Show email on invoice."
                    checked={showClinicEmail}
                    onCheckedChange={setShowClinicEmail}
                    testId="toggle-show-email"
                  />
                  <Separator />
                  <SettingToggle
                    label="Patient Information"
                    description="Show pet name, species, breed on the invoice."
                    checked={showPatientInfo}
                    onCheckedChange={setShowPatientInfo}
                    testId="toggle-show-patient"
                  />
                  <Separator />
                  <SettingToggle
                    label="Due Date"
                    description="Show due date field on the invoice."
                    checked={showDueDate}
                    onCheckedChange={setShowDueDate}
                    testId="toggle-show-due-date"
                  />
                  <Separator />
                  <SettingToggle
                    label="Notes Section"
                    description="Show notes/remarks area on invoice."
                    checked={showNotes}
                    onCheckedChange={setShowNotes}
                    testId="toggle-show-notes"
                  />
                  <Separator />
                  <SettingToggle
                    label="Terms & Conditions"
                    description="Show terms and conditions section."
                    checked={showTerms}
                    onCheckedChange={setShowTerms}
                    testId="toggle-show-terms"
                  />
                  <Separator />
                  <SettingToggle
                    label="UPI QR Code"
                    description="Show payment QR code on invoice."
                    checked={showUpiQr}
                    onCheckedChange={setShowUpiQr}
                    testId="toggle-show-upi"
                  />
                  <Separator />
                  <SettingToggle
                    label="Footer Text"
                    description="Show footer/thank-you message."
                    checked={showFooter}
                    onCheckedChange={setShowFooter}
                    testId="toggle-show-footer"
                  />
                </TabsContent>

                <TabsContent value="columns" className="flex flex-col gap-4 mt-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Customize the column header labels in the invoice table.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Label>Description Column</Label>
                    <Input
                      value={colDescription}
                      onChange={(e) => setColDescription(e.target.value)}
                      placeholder="Description of Services"
                      data-testid="input-col-description"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Quantity Column</Label>
                    <Input
                      value={colQuantity}
                      onChange={(e) => setColQuantity(e.target.value)}
                      placeholder="Qty"
                      data-testid="input-col-quantity"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Price Column</Label>
                    <Input
                      value={colPrice}
                      onChange={(e) => setColPrice(e.target.value)}
                      placeholder="Price"
                      data-testid="input-col-price"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Total Column</Label>
                    <Input
                      value={colTotal}
                      onChange={(e) => setColTotal(e.target.value)}
                      placeholder="Total"
                      data-testid="input-col-total"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="print" className="flex flex-col gap-4 mt-4">
                  <div className="flex flex-col gap-1.5">
                    <Label>Printer / Paper Type</Label>
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
                </TabsContent>
              </Tabs>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={saveAllInvoiceSettings}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-invoice-design"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {saveMutation.isPending ? "Saving..." : "Save Invoice Design"}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Live Preview</span>
              </div>
              <div className="sticky top-20">
                <InvoicePreview
                  headerColor={invoiceHeaderColor}
                  headerTextColor={invoiceHeaderTextColor}
                  accentColor={invoiceAccentColor}
                  fontFamily={fontFamily}
                  clinicLogoUrl={clinicLogoUrl}
                  logoSize={invoiceLogoSize}
                  logoPosition={invoiceLogoPosition}
                  clinicName={clinicName || "PetPoint Pro Veterinary Clinic"}
                  clinicAddress={clinicAddress || "123 Main Street, Bengaluru, Karnataka 560001"}
                  clinicPhone={clinicPhone || "+91 80 1234 5678"}
                  clinicEmail={clinicEmail || "clinic@petpointpro.in"}
                  gstNumber={gstNumber || "29ABCDE1234F1ZH"}
                  registrationNumber={registrationNumber || "VET/KA/2024/001"}
                  footerText={footerText || "Thank you for choosing PetPoint Pro!"}
                  termsConditions={termsConditions || "Payment due within 7 days. No refunds after treatment."}
                  upiId={upiId || "clinic@upi"}
                  upiPayeeName={upiPayeeName || clinicName || "PetPoint Pro"}
                  invoiceTitle={invoiceTitle}
                  showGst={showGst}
                  showRegNumber={showRegNumber}
                  showClinicPhone={showClinicPhone}
                  showClinicEmail={showClinicEmail}
                  showTerms={showTerms}
                  showNotes={showNotes}
                  showFooter={showFooter}
                  showUpiQr={showUpiQr}
                  showPatientInfo={showPatientInfo}
                  showDueDate={showDueDate}
                  tableStyle={invoiceTableStyle}
                  colDescription={colDescription}
                  colQuantity={colQuantity}
                  colPrice={colPrice}
                  colTotal={colTotal}
                  totalBgMatchHeader={invoiceTotalBgHeader === "true"}
                />
              </div>
            </div>
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
