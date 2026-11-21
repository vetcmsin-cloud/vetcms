import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, RotateCcw, FlaskConical, Microscope } from "lucide-react";

// ─── Parameter Definitions ───────────────────────────────────────────────────

export interface EvcParameter {
    key: string;
    label: string;
    type: "percentage" | "select" | "text" | "date" | "textarea";
    options?: string[];
    unit?: string;
    group?: string;
}

// ── EVC (Vaginal Cytology) parameters ────────────────────────────────────────
export const EVC_PARAMETERS: EvcParameter[] = [
    { key: "evc_parabasal_cells",         label: "Parabasal Cells",               type: "percentage", unit: "%",     group: "Cell Count" },
    { key: "evc_small_intermediate_cells", label: "Small Intermediate Cells",      type: "percentage", unit: "%",     group: "Cell Count" },
    { key: "evc_large_intermediate_cells", label: "Large Intermediate Cells",      type: "percentage", unit: "%",     group: "Cell Count" },
    { key: "evc_superficial_cells",        label: "Superficial Cells",             type: "percentage", unit: "%",     group: "Cell Count" },
    { key: "evc_anuclear_cornified_cells", label: "Anuclear Cornified Cells (AKC)",type: "percentage", unit: "%",     group: "Cell Count" },
    { key: "evc_neutrophils",              label: "Neutrophils",                   type: "percentage", unit: "%",     group: "Cell Count" },
    { key: "evc_rbc",                      label: "RBC",                           type: "percentage", unit: "%",     group: "Cell Count" },
    { key: "evc_bacteria",                 label: "Bacteria",                      type: "select",     options: ["Few","Moderate","Many","Absent"], group: "Cell Count" },
    { key: "evc_yeast",                    label: "Yeast",                         type: "select",     options: ["Few","Moderate","Many","Absent"], group: "Cell Count" },
    { key: "evc_cytology_stage",           label: "Cytology Stage",               type: "select",     options: ["Proestrus","Early Estrus","Standing Estrus","Diestrus","Anestrus"], group: "Cytology Stage" },
    { key: "evc_sample_date",              label: "Sample Date",                   type: "date",       group: "Sample Info" },
    { key: "evc_interpretation",           label: "Interpretation / Remarks",      type: "text",       group: "Interpretation" },
];

// ── Progesterone Assay parameters ─────────────────────────────────────────────
export const PROG_PARAMETERS: EvcParameter[] = [
    { key: "prog_sample_date",     label: "Sample Date",          type: "date",     group: "Progesterone Assay" },
    { key: "prog_value",           label: "Progesterone Value",   type: "text",     unit: "ng/ml", group: "Progesterone Assay" },
    { key: "prog_first_cross",     label: "1st Cross",            type: "date",     group: "Progesterone Assay" },
    { key: "prog_second_cross",    label: "2nd Cross",            type: "date",     group: "Progesterone Assay" },
    { key: "prog_third_cross",     label: "3rd Cross",            type: "date",     group: "Progesterone Assay" },
    { key: "prog_interpretation",  label: "Interpretation",       type: "text",     group: "Progesterone Assay" },
];

// ── Cycle Timeline parameters ──────────────────────────────────────────────────
export const TIMELINE_PARAMETERS: EvcParameter[] = [
    { key: "timeline_heat_started_date",      label: "Heat Started Date",             type: "date", group: "Cycle Timeline" },
    { key: "evc_sample_date",                  label: "Vaginal Cytology Date",         type: "date", group: "Cycle Timeline" },
    { key: "prog_sample_date",                 label: "Progesterone Date",             type: "date", group: "Cycle Timeline" },
    { key: "prog_first_cross",                 label: "First Breeding Date (1st Cross)",type: "date", group: "Cycle Timeline" },
    { key: "prog_second_cross",                label: "Second Breeding Date (2nd Cross)",type: "date", group: "Cycle Timeline" },
    { key: "timeline_pregnancy_scan_date",    label: "Pregnancy Scan Date (Day 25)",  type: "date", group: "Cycle Timeline" },
    { key: "timeline_xray_date",              label: "X-ray Date (Day 45)",            type: "date", group: "Cycle Timeline" },
    { key: "timeline_expected_whelping_date",  label: "Expected Whelping Date",         type: "date", group: "Cycle Timeline" },
];

// ── All parameters (for export / renderer use) ────────────────────────────────
export const ALL_REPRODUCTIVE_PARAMETERS: EvcParameter[] = [
    ...EVC_PARAMETERS,
    ...PROG_PARAMETERS,
    ...TIMELINE_PARAMETERS,
    { key: "evc_notes", label: "EVC Notes",                type: "textarea", group: "EVC Notes" },
    { key: "prog_notes", label: "Progesterone Assay Notes", type: "textarea", group: "Progesterone Notes" },
];

// ─── Storage keys & defaults ──────────────────────────────────────────────────

const EVC_STORAGE_KEY      = "evc_selected_params_v3";
const PROG_STORAGE_KEY     = "prog_selected_params_v3";
const TIMELINE_STORAGE_KEY = "timeline_selected_params_v1";

const EVC_DEFAULT_SELECTED: string[] = [
    "evc_parabasal_cells","evc_small_intermediate_cells","evc_large_intermediate_cells",
    "evc_superficial_cells","evc_anuclear_cornified_cells","evc_neutrophils","evc_rbc",
    "evc_bacteria","evc_yeast","evc_cytology_stage","evc_sample_date",
];

const PROG_DEFAULT_SELECTED: string[] = [
    "prog_sample_date","prog_value","prog_first_cross","prog_second_cross","prog_third_cross","prog_interpretation",
];

const TIMELINE_DEFAULT_SELECTED: string[] = [
    "timeline_heat_started_date",
    "evc_sample_date",
    "prog_sample_date",
    "prog_first_cross",
    "prog_second_cross",
    "timeline_pregnancy_scan_date",
    "timeline_xray_date",
    "timeline_expected_whelping_date",
];

function loadKeys(storageKey: string, defaults: string[]): string[] {
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return defaults;
}
function saveKeys(storageKey: string, keys: string[]) {
    try { localStorage.setItem(storageKey, JSON.stringify(keys)); } catch { /* ignore */ }
}

// ─── Timeline Node Icon & Component ──────────────────────────────────────────

function TimelineNodeIcon({ type, isComplete, color }: { type: string; isComplete: boolean; color?: string }) {
    const iconColor = isComplete ? (color || "#c21253") : "#94a3b8";

    if (type === "droplet") {
        return (
            <svg viewBox="0 0 24 24" width="18" height="18" fill={iconColor} stroke="none">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
        );
    }
    if (type === "microscope") {
        return (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 18h8" /><path d="M3 22h18" /><path d="M14 22a7 7 0 1 0-14 0" /><path d="M9 14l2-2" /><path d="M9 12l2 2" /><path d="M12 6l3 3" /><path d="M15 3l3 3" />
            </svg>
        );
    }
    if (type === "flask") {
        return (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55A2 2 0 0 0 6.54 23h10.92a2 2 0 0 0 1.82-2.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
                <path d="M8.5 2h7" /><path d="M7 16h10" />
            </svg>
        );
    }
    if (type === "heart") {
        return (
            <svg viewBox="0 0 24 24" width="18" height="18" fill={iconColor} stroke="none">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
        );
    }
    if (type === "scan") {
        return (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 14s1.5-2 5-2 5 2 5 2" />
                <circle cx="9" cy="8" r="1.5" fill={iconColor} />
            </svg>
        );
    }
    if (type === "xray") {
        return (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <path d="M12 6v12" /><path d="M8 9h8" /><path d="M9 14h6" />
            </svg>
        );
    }
    if (type === "dog") {
        return (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="7" />
                <circle cx="9" cy="10" r="1" fill={iconColor} />
                <circle cx="15" cy="10" r="1" fill={iconColor} />
                <path d="M10 14a2 2 0 0 0 4 0" />
                <path d="M7 6L4 3" /><path d="M17 6l3-3" />
            </svg>
        );
    }
    return null;
}

export function CycleTimelineComponent({ details, brandColor }: { details: Record<string, string> | null; brandColor?: string }) {
    const d = details || {};
    const primaryColor = brandColor || "#c21253";

    const heatStartedDate = d.timeline_heat_started_date || "";
    const cytoDate = d.evc_sample_date || d.timeline_cytology_date || "";
    const cytoStage = d.evc_cytology_stage || "";
    const progDate = d.prog_sample_date || d.timeline_progesterone_date || "";
    const progVal = d.prog_value ? `${d.prog_value} ng/ml` : "";
    const firstBreedingDate = d.prog_first_cross || d.timeline_first_breeding_date || "";
    const secondBreedingDate = d.prog_second_cross || d.timeline_second_breeding_date || "";
    const pregScanDate = d.timeline_pregnancy_scan_date || "";
    const xrayDate = d.timeline_xray_date || "";
    const expectedWhelpingDate = d.timeline_expected_whelping_date || "";

    const formatDateShort = (str?: string) => {
        if (!str) return "";
        try {
            const dateObj = new Date(str);
            if (isNaN(dateObj.getTime())) return str;
            const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = months[dateObj.getMonth()];
            const year = dateObj.getFullYear();
            return `${day}-${month}-${year}`;
        } catch {
            return str;
        }
    };

    const stages = [
        { key: "heat", title: "Heat Started", subtitle: "", date: formatDateShort(heatStartedDate), iconType: "droplet" },
        { key: "cytology", title: "Vaginal Cytology", subtitle: cytoStage, date: formatDateShort(cytoDate), iconType: "microscope" },
        { key: "progesterone", title: "Progesterone", subtitle: progVal, date: formatDateShort(progDate), iconType: "flask" },
        { key: "breeding1", title: "First Breeding", subtitle: "", date: formatDateShort(firstBreedingDate), iconType: "heart" },
        { key: "breeding2", title: "Second Breeding", subtitle: "", date: formatDateShort(secondBreedingDate), iconType: "heart" },
        { key: "scan", title: "Pregnancy Scan", subtitle: "", date: formatDateShort(pregScanDate), iconType: "scan" },
        { key: "xray", title: "X-ray", subtitle: "", date: formatDateShort(xrayDate), iconType: "xray" },
        { key: "whelping", title: "Expected Whelping", subtitle: "", date: formatDateShort(expectedWhelpingDate), iconType: "dog" }
    ];

    return (
        <div style={{
            position: "relative",
            border: `1.5px solid ${primaryColor}`,
            borderRadius: "8px",
            padding: "24px 8px 16px 8px",
            marginTop: "16px",
            marginBottom: "12px",
            background: "#ffffff",
            fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif"
        }}>
            {/* ── Badge ── */}
            <div style={{
                position: "absolute",
                top: "-1px",
                left: "-1px",
                background: primaryColor,
                color: "#ffffff",
                padding: "3px 10px",
                borderRadius: "6px 0 6px 0",
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase"
            }}>
                CYCLE TIMELINE
            </div>

            {/* ── Timeline Nodes Row ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
                {stages.map((st, idx) => {
                    const isComplete = Boolean(st.date && st.date.trim() !== "");
                    const isNextComplete = idx < stages.length - 1 && Boolean(stages[idx + 1].date && stages[idx + 1].date.trim() !== "");

                    return (
                        <div key={st.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1, minWidth: 0 }}>
                            {/* Connecting Line to next node */}
                            {idx < stages.length - 1 && (
                                <div style={{
                                    position: "absolute",
                                    top: "40px",
                                    left: "50%",
                                    width: "100%",
                                    height: "0px",
                                    borderTop: isNextComplete ? `1.5px solid ${primaryColor}65` : "1.5px dashed #cbd5e1",
                                    transform: "translateY(-50%)",
                                    zIndex: 0
                                }} />
                            )}

                            {/* Date Label ABOVE Node */}
                            <div style={{
                                fontSize: "8.5px",
                                fontWeight: 700,
                                color: isComplete ? primaryColor : "#94a3b8",
                                minHeight: "22px",
                                marginBottom: "2px",
                                textAlign: "center",
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                width: "100%",
                                lineHeight: 1.2,
                                overflow: "hidden",
                                padding: "0 1px",
                            }}>
                                {st.date || ""}
                            </div>

                            {/* Circle Node Icon */}
                            <div style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                border: isComplete ? `2px solid ${primaryColor}` : "2px dashed #94a3b8",
                                background: "#ffffff",
                                color: isComplete ? primaryColor : "#94a3b8",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 2,
                                flexShrink: 0,
                                boxShadow: isComplete ? "0 1px 3px rgba(14,116,144,0.15)" : "none"
                            }}>
                                <TimelineNodeIcon type={st.iconType} isComplete={isComplete} color={primaryColor} />
                            </div>

                            {/* Title & Subtitle below circle */}
                            <div style={{ marginTop: "4px", textAlign: "center", minHeight: "28px", width: "100%", padding: "0 1px" }}>
                                <div style={{
                                    fontSize: "9px",
                                    fontWeight: 700,
                                    color: isComplete ? "#1e293b" : "#64748b",
                                    lineHeight: 1.2,
                                    wordBreak: "break-word",
                                    whiteSpace: "normal",
                                }}>
                                    {st.title}
                                </div>
                                {st.subtitle && (
                                    <div style={{
                                        fontSize: "8px",
                                        fontWeight: 600,
                                        color: isComplete ? primaryColor : "#94a3b8",
                                        marginTop: "1px",
                                        lineHeight: 1.2
                                    }}>
                                        {st.subtitle}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Helper to calculate days offset
function addDaysToDateString(dateStr: string, days: number): string {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        d.setDate(d.getDate() + days);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    } catch {
        return "";
    }
}

// ─── Sub-section component ────────────────────────────────────────────────────

interface SectionBuilderProps {
    title: string;
    icon: React.ReactNode;
    accentClass: string;             // Tailwind border/bg colour token
    parameters: EvcParameter[];
    storageKey: string;
    defaultSelected: string[];
    value: Record<string, string>;
    onChange: (v: Record<string, string>) => void;
    notesKey?: string;
    notesLabel?: string;
}

function SectionBuilder({
    title, icon, accentClass, parameters, storageKey, defaultSelected,
    value, onChange, notesKey, notesLabel,
}: SectionBuilderProps) {
    const [selected, setSelected] = useState<string[]>(() => loadKeys(storageKey, defaultSelected));
    const [showConfig, setShowConfig] = useState(false);

    useEffect(() => { saveKeys(storageKey, selected); }, [selected, storageKey]);

    const toggle = (key: string) =>
        setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const reset = () => setSelected(defaultSelected);

    const set = (key: string, val: string) => onChange({ ...value, [key]: val });

    // Group params
    const groups = parameters.reduce((acc, p) => {
        const g = p.group || "Other";
        if (!acc[g]) acc[g] = [];
        acc[g].push(p);
        return acc;
    }, {} as Record<string, EvcParameter[]>);

    const activeParams = parameters.filter(p => selected.includes(p.key));
    const activeGroups = activeParams.reduce((acc, p) => {
        const g = p.group || "Other";
        if (!acc[g]) acc[g] = [];
        acc[g].push(p);
        return acc;
    }, {} as Record<string, EvcParameter[]>);

    const isCellCount = (g: string) => g === "Cell Count";

    return (
        <div className="space-y-3">
            {/* Section header */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${accentClass}`}>
                <div className="flex items-center gap-2">
                    {icon}
                    <div>
                        <div className="font-semibold text-sm">{title}</div>
                        <div className="text-xs opacity-70">{activeParams.length} parameters selected</div>
                    </div>
                </div>
                <Button type="button" variant="outline" size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setShowConfig(v => !v)}>
                    <Settings2 className="w-3.5 h-3.5 mr-1" />
                    {showConfig ? "Done" : "Configure"}
                </Button>
            </div>

            {/* Configure panel */}
            {showConfig && (
                <div className="border rounded-lg p-4 bg-slate-50 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Select parameters to include</span>
                        <Button type="button" variant="ghost" size="sm"
                            className="h-6 px-2 text-xs text-slate-500"
                            onClick={reset}>
                            <RotateCcw className="w-3 h-3 mr-1" /> Reset
                        </Button>
                    </div>
                    {Object.entries(groups).map(([groupName, params]) => (
                        <div key={groupName} className="space-y-2">
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b pb-1">{groupName}</div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {params.map(param => (
                                    <label key={param.key}
                                        className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white transition-colors">
                                        <Checkbox
                                            checked={selected.includes(param.key)}
                                            onCheckedChange={() => toggle(param.key)}
                                        />
                                        <span className="text-xs text-slate-700 leading-tight">{param.label}</span>
                                        {param.unit && (
                                            <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto shrink-0">{param.unit}</Badge>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                    <p className="text-xs text-slate-400 italic">Selection is remembered for future reports.</p>
                </div>
            )}

            {/* Entry form */}
            <div className="space-y-4">
                {Object.entries(activeGroups).map(([groupName, params]) => (
                    <div key={groupName} className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 pb-1 flex items-center gap-2">
                            <span>{groupName}</span>
                            {isCellCount(groupName) && (
                                <span className="text-[10px] font-normal text-slate-400 normal-case tracking-normal">(total should add to 100%)</span>
                            )}
                        </div>

                        {isCellCount(groupName) ? (
                            <div className="border rounded-md overflow-hidden">
                                <div className="grid grid-cols-[1fr_auto] bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase">
                                    <span>Parameter</span>
                                    <span className="w-28 text-right">Value</span>
                                </div>
                                {params.map((param, idx) => (
                                    <div key={param.key}
                                        className={`grid grid-cols-[1fr_auto] px-3 py-2 items-center gap-2 border-t border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                                        <Label className="text-xs font-medium text-slate-700">{param.label}</Label>
                                        {param.type === "percentage" ? (
                                            <div className="flex items-center gap-1 w-28">
                                                <Input type="number" min="0" max="100" step="0.5"
                                                    className="h-7 text-sm text-right w-20"
                                                    placeholder="0"
                                                    value={value[param.key] || ""}
                                                    onChange={e => set(param.key, e.target.value)} />
                                                <span className="text-xs text-slate-400 shrink-0">%</span>
                                            </div>
                                        ) : param.type === "select" ? (
                                            <div className="w-28">
                                                <Select value={value[param.key] || ""} onValueChange={v => set(param.key, v)}>
                                                    <SelectTrigger className="h-7 text-xs">
                                                        <SelectValue placeholder="Select" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {param.options?.map(opt => (
                                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {params.map(param => (
                                    <div key={param.key} className="space-y-1">
                                        <Label className="text-xs font-medium text-slate-700">
                                            {param.label}
                                            {param.unit && <span className="ml-1 text-[10px] text-slate-400">({param.unit})</span>}
                                        </Label>
                                        {param.type === "select" ? (
                                            <Select value={value[param.key] || ""} onValueChange={v => set(param.key, v)}>
                                                <SelectTrigger className="h-8 text-sm">
                                                    <SelectValue placeholder="Select..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {param.options?.map(opt => (
                                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : param.type === "date" ? (
                                            <Input type="date" className="h-8 text-sm"
                                                value={value[param.key] || ""}
                                                onChange={e => set(param.key, e.target.value)} />
                                        ) : (
                                            <Input type="text" className="h-8 text-sm"
                                                placeholder={`Enter ${param.label.toLowerCase()}...`}
                                                value={value[param.key] || ""}
                                                onChange={e => set(param.key, e.target.value)} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {activeParams.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm italic border border-dashed rounded-lg">
                    No parameters selected. Click "Configure" to select parameters.
                </div>
            )}

            {/* Notes field – shown only if notesKey is provided */}
            {notesKey && notesLabel && (
                <div className="space-y-1 pt-2 border-t border-slate-100">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{notesLabel}</Label>
                    <Textarea
                        className="text-sm min-h-[72px] resize-y"
                        placeholder={`Enter notes / remarks for ${title}...`}
                        value={value[notesKey] || ""}
                        onChange={e => set(notesKey, e.target.value)}
                    />
                </div>
            )}
        </div>
    );
}

// ─── Main exported component ──────────────────────────────────────────────────

interface VaginalCytologyBuilderProps {
    value: Record<string, string>;
    onChange: (value: Record<string, string>) => void;
    reportTitle?: string;
}

export function VaginalCytologyBuilder({ value, onChange, reportTitle }: VaginalCytologyBuilderProps) {
    const isProgOnly = reportTitle ? (reportTitle.includes("Progesterone") && !reportTitle.includes("EVC") && !reportTitle.includes("Vaginal Cytology")) : false;
    const isEvcOnly = reportTitle ? ((reportTitle.includes("EVC") || reportTitle.includes("Vaginal Cytology")) && !reportTitle.includes("Progesterone")) : false;

    const showEvc = !isProgOnly;
    const showProg = !isEvcOnly;

    const handleTimelineChange = (newVals: Record<string, string>) => {
        const updated = { ...newVals };
        // Auto-calc scan (+25d), xray (+45d), whelping (+63d) from 1st cross if not set
        const firstCross = updated.prog_first_cross || value.prog_first_cross;
        if (firstCross) {
            if (!value.timeline_pregnancy_scan_date && !updated.timeline_pregnancy_scan_date) {
                const autoScan = addDaysToDateString(firstCross, 25);
                if (autoScan) updated.timeline_pregnancy_scan_date = autoScan;
            }
            if (!value.timeline_xray_date && !updated.timeline_xray_date) {
                const autoXray = addDaysToDateString(firstCross, 45);
                if (autoXray) updated.timeline_xray_date = autoXray;
            }
            if (!value.timeline_expected_whelping_date && !updated.timeline_expected_whelping_date) {
                const autoWhelp = addDaysToDateString(firstCross, 63);
                if (autoWhelp) updated.timeline_expected_whelping_date = autoWhelp;
            }
        }
        onChange(updated);
    };

    return (
        <div className="space-y-6">
            {/* ── EVC Section ── */}
            {showEvc && (
                <SectionBuilder
                    title="Vaginal Cytology (EVC)"
                    icon={<Microscope className="w-4 h-4 text-rose-700" />}
                    accentClass="bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200 text-rose-800"
                    parameters={EVC_PARAMETERS}
                    storageKey={EVC_STORAGE_KEY}
                    defaultSelected={EVC_DEFAULT_SELECTED}
                    value={value}
                    onChange={onChange}
                />
            )}

            {/* ── Progesterone Section ── */}
            {showProg && (
                <SectionBuilder
                    title="Progesterone Assay"
                    icon={<FlaskConical className="w-4 h-4 text-violet-700" />}
                    accentClass="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 text-violet-800"
                    parameters={PROG_PARAMETERS}
                    storageKey={PROG_STORAGE_KEY}
                    defaultSelected={PROG_DEFAULT_SELECTED}
                    value={value}
                    onChange={handleTimelineChange}
                />
            )}

            {/* ── Cycle Timeline Manual Entry Dates ── */}
            <SectionBuilder
                title="Cycle Timeline Dates"
                icon={<Settings2 className="w-4 h-4 text-blue-700" />}
                accentClass="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-800"
                parameters={TIMELINE_PARAMETERS}
                storageKey={TIMELINE_STORAGE_KEY}
                defaultSelected={TIMELINE_DEFAULT_SELECTED}
                value={value}
                onChange={handleTimelineChange}
            />

            {/* ── Live Cycle Timeline Preview ── */}
            <div className="mt-4">
                <CycleTimelineComponent details={value} />
            </div>
        </div>
    );
}
