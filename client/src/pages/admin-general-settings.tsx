import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { ArrowLeft, Globe, Save, Loader2, Clock, Send, RotateCcw } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { TIMEZONE_OPTIONS, DEFAULT_TIMEZONE, formatInTZ } from "@/lib/timezone";

export default function AdminGeneralSettings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/clinic-settings"],
  });

  const [clinicTimezone, setClinicTimezone] = useState(DEFAULT_TIMEZONE);
  const [whatsappMode, setWhatsappMode] = useState("direct");
  const [whatsappCountryCode, setWhatsappCountryCode] = useState("91");
  const [whatsappInstanceId, setWhatsappInstanceId] = useState("");
  const [whatsappApiToken, setWhatsappApiToken] = useState("");
  const [whatsappWebhookUrl, setWhatsappWebhookUrl] = useState("");
  const [whatsappFooter, setWhatsappFooter] = useState("");
  const [whatsappLabReportTemplate, setWhatsappLabReportTemplate] = useState("");
  const [evolutionApiUrl, setEvolutionApiUrl] = useState("");
  const [evolutionApiKey, setEvolutionApiKey] = useState("");
  const [evolutionInstance, setEvolutionInstance] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const DEFAULT_LAB_REPORT_TEMPLATE = `*Lab Report Notification*

Dear {ownerName},
Here is the lab report for your pet *{petName}*:

🧪 Test: {testTitle}
🏷️ Category: {category}
📅 Date: {reportDate}
📌 Status: {status}
{resultSummary}
🔗 View Full Report: {reportUrl}

Thank you,
{clinicName}`;

  useEffect(() => {
    if (settings) {
      setClinicTimezone(settings.clinicTimezone || DEFAULT_TIMEZONE);
      setWhatsappMode(settings.whatsappMode || "direct");
      setWhatsappCountryCode(settings.whatsappCountryCode || "91");
      setWhatsappInstanceId(settings.whatsappInstanceId || "");
      setWhatsappApiToken(settings.whatsappApiToken || "");
      setWhatsappWebhookUrl(settings.whatsappWebhookUrl || "");
      setWhatsappFooter(settings.whatsappFooter || "Thank you for choosing PetPoint Pro Veterinary Clinic.");
      setWhatsappLabReportTemplate(settings.whatsappLabReportTemplate || DEFAULT_LAB_REPORT_TEMPLATE);
      setEvolutionApiUrl(settings.evolutionApiUrl || "");
      setEvolutionApiKey(settings.evolutionApiKey || "");
      setEvolutionInstance(settings.evolutionInstance || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("PATCH", "/api/clinic-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinic-settings"] });
      toast({ title: "Settings saved", description: "General & WhatsApp settings updated successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleTestWhatsApp = async () => {
    if (!testPhone) {
      toast({ title: "Test Failed", description: "Please enter a test mobile number.", variant: "destructive" });
      return;
    }
    setIsTesting(true);
    try {
      const message = `*Test WhatsApp Message*\n\nHello! This is a test message from your PetPoint Pro Clinic setup.\n\n${whatsappFooter}`;
      const res = await apiRequest("POST", "/api/whatsapp/send", { phone: testPhone, message });
      const data = await res.json();

      if (data.mode === "direct" && data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast({ title: "WhatsApp Direct Opened", description: "Opened WhatsApp test chat in a new tab." });
      } else if (data.success) {
        toast({ title: "WhatsApp Message Sent", description: `Successfully sent test message via ${data.mode.toUpperCase()} gateway.` });
      } else {
        toast({ title: "Sending Failed", description: data.message || "Could not send test message.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Test Failed", description: err.message || "Error communicating with WhatsApp endpoint.", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  const now = new Date();
  const previewTime = formatInTZ(now, clinicTimezone, true);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto" data-testid="page-general-settings">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button size="icon" variant="ghost" data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <Globe className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">General & WhatsApp Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-[72px]">
          Configure regional preferences and WhatsApp customer messaging gateway settings.
        </p>
      </div>

      {/* Timezone Card */}
      <Card data-testid="card-timezone">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-500/10 flex-shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-base">Timezone</CardTitle>
            <p className="text-xs text-muted-foreground">
              All dates and times shown in the app will use this timezone.
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="select-timezone">Clinic Timezone</Label>
            <Select value={clinicTimezone} onValueChange={setClinicTimezone}>
              <SelectTrigger id="select-timezone" className="w-full" data-testid="select-timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Live preview */}
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-amber-700">Current time in selected timezone</span>
              <span className="text-sm font-semibold text-amber-900">{previewTime}</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => saveMutation.mutate({ clinicTimezone })}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-save-general-settings"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Timezone
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Configuration Card */}
      <Card data-testid="card-whatsapp">
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-emerald-500/10 flex-shrink-0">
            <FaWhatsapp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-base">WhatsApp Gateway Configuration</CardTitle>
            <p className="text-xs text-muted-foreground">
              Configure how lab reports, invoices, and appointment reminders are sent to customer mobile numbers.
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* Messaging Mode Selection */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="select-whatsapp-mode">Messaging Mode</Label>
            <Select value={whatsappMode} onValueChange={setWhatsappMode}>
              <SelectTrigger id="select-whatsapp-mode">
                <SelectValue placeholder="Select messaging mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct WhatsApp Web / App (Free, No Setup Needed)</SelectItem>
                <SelectItem value="evolution">Evolution API (Free, Self-Hosted)</SelectItem>
                <SelectItem value="ultramsg">UltraMsg API Gateway (Automated, Paid)</SelectItem>
                <SelectItem value="custom">Custom Webhook Gateway Endpoint</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {whatsappMode === "direct" && "Direct Mode opens WhatsApp Web/App directly with pre-formatted report summaries. Works out-of-the-box with zero configuration."}
              {whatsappMode === "evolution" && "Evolution API is a free, self-hosted WhatsApp REST API (uses Baileys). Runs on your VPS via Docker — fully automated, no per-message fees."}
              {whatsappMode === "ultramsg" && "UltraMsg automatically sends background WhatsApp messages using your UltraMsg Instance ID & Token."}
              {whatsappMode === "custom" && "Sends a POST request payload { phone, message } to your custom API webhook."}
            </p>
          </div>

          {/* Country Code */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="input-country-code">Default Country Code</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">+</span>
              <Input
                id="input-country-code"
                placeholder="91"
                value={whatsappCountryCode}
                onChange={(e) => setWhatsappCountryCode(e.target.value)}
                className="w-32"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Prepended automatically to 10-digit customer mobile numbers (e.g. 91 for India, 1 for US/Canada, 44 for UK).
            </p>
          </div>

          {/* Gateway Provider Specific Credentials */}
          {whatsappMode === "evolution" && (
            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-green-50/60 border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-green-800">Evolution API Credentials</span>
                <a
                  href="https://doc.evolution-api.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-green-700 hover:underline font-medium"
                >
                  📖 Setup Docs ↗
                </a>
              </div>
              <div className="flex flex-col gap-1.5 rounded-md bg-green-100/60 border border-green-200 px-3 py-2 text-[11px] text-green-800">
                <span className="font-semibold">Quick Setup:</span>
                <span>1. Install Evolution API on your VPS using Docker</span>
                <span>2. Create an instance &amp; scan QR with your WhatsApp</span>
                <span>3. Paste the base URL, API key and instance name below</span>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="input-evolution-url">Evolution API Base URL</Label>
                <Input
                  id="input-evolution-url"
                  placeholder="e.g. https://api.yourdomain.com"
                  value={evolutionApiUrl}
                  onChange={(e) => setEvolutionApiUrl(e.target.value.replace(/\/$/, ""))}
                />
                <p className="text-[10px] text-muted-foreground">Your self-hosted Evolution API server URL (no trailing slash).</p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="input-evolution-key">Global API Key</Label>
                <Input
                  id="input-evolution-key"
                  type="password"
                  placeholder="Your AUTHENTICATION_API_KEY from .env"
                  value={evolutionApiKey}
                  onChange={(e) => setEvolutionApiKey(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="input-evolution-instance">Instance Name</Label>
                <Input
                  id="input-evolution-instance"
                  placeholder="e.g. clinic-whatsapp"
                  value={evolutionInstance}
                  onChange={(e) => setEvolutionInstance(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">The instance name you created in Evolution API (must be connected via QR).</p>
              </div>
            </div>
          )}

          {whatsappMode === "ultramsg" && (
            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-emerald-50/50 border-emerald-200">
              <span className="text-xs font-semibold text-emerald-800">UltraMsg API Credentials</span>
              <div className="flex flex-col gap-2">
                <Label htmlFor="input-instance-id">UltraMsg Instance ID</Label>
                <Input
                  id="input-instance-id"
                  placeholder="e.g. instance12345"
                  value={whatsappInstanceId}
                  onChange={(e) => setWhatsappInstanceId(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="input-token">UltraMsg Token / API Key</Label>
                <Input
                  id="input-token"
                  type="password"
                  placeholder="Secret token"
                  value={whatsappApiToken}
                  onChange={(e) => setWhatsappApiToken(e.target.value)}
                />
              </div>
            </div>
          )}

          {whatsappMode === "custom" && (
            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-blue-50/50 border-blue-200">
              <span className="text-xs font-semibold text-blue-800">Custom Webhook Endpoint</span>
              <div className="flex flex-col gap-2">
                <Label htmlFor="input-webhook-url">Webhook Gateway URL</Label>
                <Input
                  id="input-webhook-url"
                  placeholder="https://api.example.com/send-whatsapp"
                  value={whatsappWebhookUrl}
                  onChange={(e) => setWhatsappWebhookUrl(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Lab Report WhatsApp Message Template */}
          <div className="flex flex-col gap-2.5 p-4 border rounded-lg bg-slate-50/80 border-slate-200">
            <div className="flex items-center justify-between">
              <Label htmlFor="input-wa-lab-template" className="font-semibold text-slate-800 flex items-center gap-2">
                <FaWhatsapp className="w-4 h-4 text-emerald-600" />
                Lab Report Notification Message Template
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-slate-900 gap-1"
                onClick={() => setWhatsappLabReportTemplate(DEFAULT_LAB_REPORT_TEMPLATE)}
              >
                <RotateCcw className="w-3 h-3" /> Reset to Default
              </Button>
            </div>
            
            <p className="text-[11px] text-muted-foreground">
              Customize the message sent to pet parents when sharing lab reports via WhatsApp. You can insert dynamic placeholders below.
            </p>

            <Textarea
              id="input-wa-lab-template"
              rows={11}
              value={whatsappLabReportTemplate}
              onChange={(e) => setWhatsappLabReportTemplate(e.target.value)}
              className="font-mono text-xs bg-white resize-y"
              placeholder="Enter message template..."
            />

            {/* Placeholder Quick-Insert Tags */}
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Click to Insert Placeholders:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: "{ownerName}", desc: "Owner Full Name" },
                  { tag: "{petName}", desc: "Pet Name" },
                  { tag: "{testTitle}", desc: "Test Name" },
                  { tag: "{category}", desc: "Category" },
                  { tag: "{reportDate}", desc: "Date & Time" },
                  { tag: "{status}", desc: "Status" },
                  { tag: "{resultSummary}", desc: "Summary (if any)" },
                  { tag: "{reportUrl}", desc: "Public Short Link" },
                  { tag: "{clinicName}", desc: "Clinic Name" },
                ].map(({ tag, desc }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setWhatsappLabReportTemplate(prev => `${prev} ${tag}`)}
                    className="text-[10px] bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors border border-slate-200 rounded px-2 py-0.5 font-mono text-slate-700 shadow-2xs"
                    title={`Insert ${desc}`}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Message Footer */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="input-wa-footer">Default Message Footer</Label>
            <Input
              id="input-wa-footer"
              placeholder="Thank you for choosing PetPoint Pro Veterinary Clinic."
              value={whatsappFooter}
              onChange={(e) => setWhatsappFooter(e.target.value)}
            />
          </div>

          {/* Save WhatsApp Settings */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={() =>
                saveMutation.mutate({
                  whatsappMode,
                  whatsappCountryCode,
                  whatsappInstanceId,
                  whatsappApiToken,
                  whatsappWebhookUrl,
                  whatsappFooter,
                  whatsappLabReportTemplate,
                  evolutionApiUrl,
                  evolutionApiKey,
                  evolutionInstance,
                })
              }
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save WhatsApp Settings
            </Button>
          </div>

          {/* Test WhatsApp Connection */}
          <div className="flex flex-col gap-3 pt-4 border-t mt-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              Test WhatsApp Connection
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter customer mobile number (e.g. 9876543210)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="flex-1 text-sm"
              />
              <Button
                variant="outline"
                className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={handleTestWhatsApp}
                disabled={isTesting}
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FaWhatsapp className="w-4 h-4 text-emerald-600" />}
                Send Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
