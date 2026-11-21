import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { DraggableComponent } from "../invoice-designer/DraggableComponent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
    Save, LayoutTemplate, Type,
    Image as ImageIcon,
    Trash2, RotateCcw,
    ZoomIn, ZoomOut,
    Download, Upload,
    Layers,
    ChevronUp, ChevronDown,
    Square
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { DocumentSection, DocumentDesignerConfig, DocumentSectionType, PanelDefinition } from "./types";
import { LabTest, LabRefRange } from "@shared/schema";

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

interface DocumentDesignerProps {
    config: DocumentDesignerConfig;
    initialLayout?: DocumentSection[];
    layout?: DocumentSection[];
    onLayoutChange?: (layout: DocumentSection[]) => void;
    onSave?: (layout: DocumentSection[]) => void;
    settings: Record<string, string>;
}

const generateId = (type: string) => `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function DocumentDesigner({ config, initialLayout, layout: controlledLayout, onLayoutChange, onSave, settings }: DocumentDesignerProps) {
    const { toast } = useToast();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const migrationFix = (sections: DocumentSection[]): DocumentSection[] => {
        return sections.map((s, i) => ({
            ...s,
            x: s.x ?? 40,
            y: s.y ?? (40 + i * 50),
            width: s.width ?? 200
        }));
    };

    const [internalLayout, setInternalLayout] = useState<DocumentSection[]>(() =>
        migrationFix(initialLayout && initialLayout.length > 0 ? initialLayout : [])
    );

    const layout = controlledLayout || internalLayout;

    const { data: allTests } = useQuery<LabTest[]>({ queryKey: ["/api/lab-settings/tests"] });
    const { data: allRanges } = useQuery<LabRefRange[]>({ queryKey: ["/api/lab-settings/ranges"] });

    // Helper to get dynamic reference range based on species
    const getDynamicRefRange = (rowKey: string, rowLabel: string, defaultRange: string) => {
        // Preview dummy mapping
        const previewSpecies = "Canine";

        if (!allTests || !allRanges) return defaultRange;

        const cleanKey = rowKey.replace(/^bio_/, '').toLowerCase().trim();
        const cleanLabelPrefix = rowLabel.split('(')[0].toLowerCase().trim().replace(/[^a-z0-9]/g, '');

        const test = allTests.find(t => {
            const tName = t.name.toLowerCase().trim();
            const tClean = t.name.replace(/\s*\(.*?\)\s*/g, '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            return (
                tName === rowLabel.toLowerCase().trim() ||
                tName === cleanKey ||
                tName === rowKey.toLowerCase().trim() ||
                tName.startsWith(cleanKey) ||
                tClean === cleanLabelPrefix ||
                tName === rowLabel.toLowerCase().split(' ')[0]
            );
        });

        if (test) {
            const range = allRanges.find(r =>
                r.testId === test.id &&
                r.species.toLowerCase() === previewSpecies.toLowerCase()
            );

            if (range) {
                if (range.min && range.max) return `${range.min} - ${range.max}`;
                if (range.refText) return range.refText;
            }
        }
        return defaultRange;
    };

    const setLayout = (newLayoutOrUpdater: DocumentSection[] | ((prev: DocumentSection[]) => DocumentSection[])) => {
        if (typeof newLayoutOrUpdater === "function") {
            // Functional updater — resolve against current layout first
            if (onLayoutChange) {
                onLayoutChange(newLayoutOrUpdater(controlledLayout || internalLayout));
            } else {
                setInternalLayout(prev => newLayoutOrUpdater(prev));
            }
        } else {
            if (onLayoutChange) {
                onLayoutChange(newLayoutOrUpdater);
            } else {
                setInternalLayout(newLayoutOrUpdater);
            }
        }
    };

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(0.8);
    const [showGrid, setShowGrid] = useState(false);
    const GRID_SIZE = 20;

    const addSection = (type: DocumentSectionType, fieldKey?: string, defaultWidth?: number) => {
        let startY = 100;
        if (scrollContainerRef.current) {
            const scrollTop = scrollContainerRef.current.scrollTop;
            startY = (scrollTop + 150) / zoom;
        }
        const startX = 50 + (Math.random() * 20);

        const fieldDef = fieldKey ? config.fields.find(f => f.key === fieldKey) : null;

        const newSection: DocumentSection = {
            id: generateId(type),
            type,
            isVisible: true,
            label: fieldDef ? fieldDef.label
                : type === "text" ? "Text Block"
                : type === "image" ? "Logo / Image"
                : type === "rect_sharp" ? "Rectangle (Sharp)"
                : type === "rect_round" ? "Rectangle (Rounded)"
                : `New ${type}`,
            content: type === "text" ? "Enter text here..." : undefined,
            x: startX,
            y: startY,
            width: defaultWidth || (fieldDef?.width) || 200,
            field: fieldKey,
        };
        setLayout([...layout, newSection]);
        setSelectedId(newSection.id);
        toast({ title: "Field Added", description: `Added ${newSection.label} to canvas.` });
    };

    const addPanel = (panel: PanelDefinition) => {
        let startY = 100;
        if (scrollContainerRef.current) {
            const scrollTop = scrollContainerRef.current.scrollTop;
            startY = (scrollTop + 150) / zoom;
        }
        const newSection: DocumentSection = {
            id: generateId("panel"),
            type: "panel",
            isVisible: true,
            label: panel.label,
            x: 40,
            y: startY,
            width: panel.defaultWidth || 700,
            height: panel.defaultHeight || 400,
            panelKey: panel.key,
        };
        setLayout([...layout, newSection]);
        setSelectedId(newSection.id);
        toast({ title: "Panel Added", description: `Added ${panel.label} to canvas.` });
    };

    const updateSection = (id: string, updates: Partial<DocumentSection>) => {
        setLayout(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    // Debounced variant for width/height — prevents LabReportRenderer from
    // re-rendering on every keystroke when the user types in the size inputs.
    const debounceSizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedUpdateSize = useCallback((id: string, updates: Partial<DocumentSection>) => {
        if (debounceSizeTimerRef.current) clearTimeout(debounceSizeTimerRef.current);
        debounceSizeTimerRef.current = setTimeout(() => {
            setLayout(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
        }, 200);
    }, []);


    const removeSection = (id: string) => {
        setLayout(layout.filter(s => s.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const moveBodyPanel = (id: string, direction: "up" | "down") => {
        setLayout(prev => {
            const BODY_PANEL_TYPES = new Set(["blood_smear", "wet_film", "test", "evc", "progesterone", "cycle_timeline", "usg", "usg_impression", "usg_suggestion"]);
            const FLOW_FIELD_KEYS = new Set(["cycleTimeline", "summary", "notes", "remarks"]);
            const bodyPanels = prev.filter(s => {
                if (s.position === "header" || s.position === "footer") return false;
                if (s.position === "body") return true;
                if (s.type === "field" && FLOW_FIELD_KEYS.has(s.field || "")) return true;
                if (s.type !== "panel") return false;
                const def = config.panels?.find(p => p.key === s.panelKey);
                return def ? BODY_PANEL_TYPES.has(def.panelType ?? "test") : false;
            }).sort((a, b) => (a.y || 0) - (b.y || 0));

            const idx = bodyPanels.findIndex(s => s.id === id);
            if (idx === -1) return prev;
            const swapIdx = direction === "up" ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= bodyPanels.length) return prev;

            const aY = bodyPanels[idx].y ?? (idx * 100);
            const bY = bodyPanels[swapIdx].y ?? (swapIdx * 100);
            // Ensure distinct Y values so sort order is stable
            const newAY = aY === bY ? (direction === "up" ? bY - 50 : bY + 50) : bY;
            const newBY = aY === bY ? (direction === "up" ? aY + 50 : aY - 50) : aY;

            return prev.map(s => {
                if (s.id === bodyPanels[idx].id) return { ...s, y: newAY };
                if (s.id === bodyPanels[swapIdx].id) return { ...s, y: newBY };
                return s;
            });
        });
    };

    const selectedSection = layout.find(s => s.id === selectedId);

    // Local state for width/height inputs to prevent focus-jump on debounced updates
    const [localWidth, setLocalWidth]   = useState<string>("");
    const [localHeight, setLocalHeight] = useState<string>("");
    // Sync local size inputs whenever selection changes
    useEffect(() => {
        if (selectedSection) {
            setLocalWidth(selectedSection.width != null ? String(selectedSection.width) : "");
            setLocalHeight(selectedSection.height != null ? String(selectedSection.height) : "");
        }
    }, [selectedSection?.id]); // only when the SELECTED element changes, not on every layout update

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedId) return;

            // Do not trigger if user is typing in an input or textarea
            if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
                return;
            }

            const step = e.shiftKey ? 10 : 1;
            let dx = 0;
            let dy = 0;

            switch (e.key) {
                case "ArrowUp": dy = -step; break;
                case "ArrowDown": dy = step; break;
                case "ArrowLeft": dx = -step; break;
                case "ArrowRight": dx = step; break;
                default: return;
            }

            e.preventDefault();

            setLayout(layout.map(s =>
                s.id === selectedId
                    ? { ...s, x: (s.x || 0) + dx, y: (s.y || 0) + dy }
                    : s
            ));
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedId, layout]);

    const handleSave = () => {
        if (onSave) {
            onSave(layout);
            toast({ title: "Layout Saved", description: "The design has been updated." });
        }
    };

    const handleExport = () => {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(layout, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `${config.layoutSettingKey}-layout.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            toast({ title: "Exported", description: "Layout downloaded as JSON." });
        } catch {
            toast({ title: "Export Failed", description: "Could not export layout.", variant: "destructive" });
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedLayout = JSON.parse(event.target?.result as string);
                if (Array.isArray(importedLayout)) {
                    const isValid = importedLayout.every(item =>
                        typeof item === 'object' && 'id' in item && 'type' in item
                    );
                    if (isValid) {
                        setLayout(migrationFix(importedLayout));
                        toast({ title: "Layout Imported", description: "The design has been loaded." });
                    } else {
                        toast({ title: "Import Failed", description: "Invalid layout structure.", variant: "destructive" });
                    }
                } else {
                    toast({ title: "Import Failed", description: "Invalid layout file.", variant: "destructive" });
                }
            } catch {
                toast({ title: "Import Failed", description: "Could not parse JSON.", variant: "destructive" });
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const getPreviewValue = (key: string) => {
        return config.previewValues[key] || `{${key}}`;
    };

    const renderDesignerContent = (section: DocumentSection) => {
        // Rectangle boxes — rendered as absolutely-positioned overlay boxes
        if (section.type === "rect_sharp" || section.type === "rect_round") {
            const borderColor  = section.styles?.borderColor  || "#1e293b";
            const borderWidth  = section.styles?.borderWidth  || "1";
            const borderStyle  = section.styles?.borderStyle  || "solid";
            const fillColor    = section.styles?.fillColor    || "transparent";
            const fillOpacity  = section.styles?.fillOpacity  || "1";
            const radius       = section.type === "rect_round" ? (section.styles?.borderRadius || "12px") : "0px";
            return (
                <div
                    className="w-full h-full"
                    style={{
                        border: `${borderWidth}px ${borderStyle} ${borderColor}`,
                        borderRadius: radius,
                        background: fillColor === "transparent" ? "transparent" : fillColor,
                        opacity: parseFloat(fillOpacity),
                        pointerEvents: "none",
                    }}
                />
            );
        }
        if (section.type === "text") return <div className={cn("whitespace-pre-wrap", !section.styles?.fontSize && "text-sm")}>{section.content || "Text"}</div>;
        if (section.type === "image") {
            const src = settings[config.backgroundSettingKey.replace("Background", "Logo")] || settings.invoiceLogoImage || "";
            return src ? <img src={src} alt="Logo" className="w-full h-full object-contain" /> : <div className="p-2 border border-dashed text-xs text-center">No Logo</div>;
        }
        if (section.type === "field" && section.field) {
            const label = section.label || config.fields.find(f => f.key === section.field)?.label || section.field;
            const previewVal = getPreviewValue(section.field);
            return (
                <div className="flex flex-col h-full">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider hidden group-hover:block absolute -top-4 left-0 bg-white/80 px-1 rounded shadow-sm whitespace-nowrap z-50">{label}</span>
                    <div className={cn("font-medium truncate flex-1 flex items-center whitespace-pre-line", !section.styles?.fontSize && "text-sm")}>
                        {previewVal}
                    </div>
                </div>
            );
        }
        if (section.type === "panel" && section.panelKey && config.panels) {
            const panelDef = config.panels.find(p => p.key === section.panelKey);
            if (!panelDef) return <div className="text-xs text-red-500">Unknown Panel</div>;

            // Info-type panel: 2-column label : value layout
            if (panelDef.panelType === "info") {
                const leftRows = panelDef.rows.filter(r => r.col !== "right");
                const rightRows = panelDef.rows.filter(r => r.col === "right");
                const hasRightColumn = rightRows.length > 0;

                return (
                    <div className="w-full h-full overflow-hidden flex flex-col border border-slate-300 rounded-lg p-2.5 bg-white shadow-sm" style={{ fontSize: "11px" }}>
                        <div className="font-bold text-xs mb-2 px-0.5 border-b pb-1 uppercase tracking-wider text-slate-800">{panelDef.label}</div>
                        <div className={`grid ${hasRightColumn ? "grid-cols-2 gap-4" : "grid-cols-1"}`}>
                            {/* Left Column */}
                            <div className="space-y-0.5">
                                {leftRows.map(row => (
                                    <div key={row.key} className="flex items-baseline gap-1" style={{ lineHeight: "1.7" }}>
                                        <span className="font-medium text-slate-600 whitespace-nowrap" style={{ minWidth: "100px" }}>{row.label}</span>
                                        <span className="text-slate-400 mx-0.5">:</span>
                                        <span className="font-semibold text-slate-900">{getPreviewValue(row.key)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Right Column */}
                            {hasRightColumn && (
                                <div className="space-y-0.5">
                                    {rightRows.map(row => (
                                        <div key={row.key} className="flex items-baseline gap-1" style={{ lineHeight: "1.7" }}>
                                            <span className="font-medium text-slate-600 whitespace-nowrap" style={{ minWidth: "100px" }}>{row.label}</span>
                                            <span className="text-slate-400 mx-0.5">:</span>
                                            <span className="font-semibold text-slate-900">{getPreviewValue(row.key)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }

            // Blood Smear Panel – 2-col Pathogen | Count table (designer preview)
            if (panelDef.panelType === "blood_smear") {
                const previewPathogens = [
                    { name: "Babesia canis", value: "Present" },
                    { name: "Babesia gibsoni", value: "Present" },
                    { name: "Leishmania infantum", value: "1+" },
                ];
                return (
                    <div className="w-full h-full overflow-hidden" style={{ fontSize: "10px" }}>
                        <div className="font-bold text-xs mb-1 px-1" style={{ color: "#1a1a2e" }}>{panelDef.label}</div>
                        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
                            <thead>
                                <tr style={{ background: "rgba(232,234,246,0.5)" }}>
                                    <th className="text-left px-1.5 py-1 border border-slate-300/60 font-semibold" style={{ width: "70%" }}>Pathogen</th>
                                    <th className="text-center px-1.5 py-1 border border-slate-300/60 font-semibold" style={{ width: "30%" }}>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewPathogens.map((p, i) => (
                                    <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.03)" }}>
                                        <td className="px-1.5 py-0.5 border border-slate-200/50 font-medium">{p.name}</td>
                                        <td className="text-center px-1.5 py-0.5 border border-slate-200/50 font-semibold" style={{ color: "#1565c0" }}>{p.value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }

            // Wet Film Panel – Microfilaria | Count table (designer preview)
            if (panelDef.panelType === "wet_film") {
                return (
                    <div className="w-full h-full overflow-hidden" style={{ fontSize: "10px" }}>
                        <div className="font-bold text-xs mb-1 px-1" style={{ color: "#1a1a2e" }}>{panelDef.label}</div>
                        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
                            <thead>
                                <tr style={{ background: "rgba(232,234,246,0.5)" }}>
                                    <th className="text-left px-1.5 py-1 border border-slate-300/60 font-semibold" style={{ width: "70%" }}>Pathogen</th>
                                    <th className="text-center px-1.5 py-1 border border-slate-300/60 font-semibold" style={{ width: "30%" }}>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="px-1.5 py-0.5 border border-slate-200/50 font-medium" style={{ color: "#dc2626" }}>Microfilaria</td>
                                    <td className="text-center px-1.5 py-0.5 border border-slate-200/50 font-semibold" style={{ color: "#1565c0" }}>12/slide</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                );
            }

            // Cycle Timeline Panel – visual strip preview
            if (panelDef.panelType === "cycle_timeline") {
                const previewStages = ["Heat", "Cytology", "Prog.", "1st Cross", "2nd Cross", "Scan", "X-ray", "Whelping"];
                return (
                    <div className="w-full h-full overflow-hidden p-1" style={{ fontSize: "9px" }}>
                        <div className="font-bold text-xs mb-1.5 px-1" style={{ color: "#1a1a2e" }}>Cycle Timeline</div>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "2px" }}>
                            {previewStages.map((label, i) => (
                                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", minWidth: 0 }}>
                                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: "1.5px solid #c21253", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "7px", color: "#c21253", fontWeight: 700 }}>
                                        {i + 1}
                                    </div>
                                    <div style={{ fontSize: "7px", textAlign: "center", wordBreak: "break-word", color: "#475569", lineHeight: 1.1 }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            // USG Panel – organ-by-organ findings preview
            if (panelDef.panelType === "usg") {
                const fs = section.styles?.fontSize || "9px";
                const lh = section.styles?.lineHeight || "1.5";
                const layout = section.styles?.fieldLayout || "inline";
                return (
                    <div className="w-full h-full overflow-hidden p-1.5" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: fs, lineHeight: lh, color: "#0a0a0a" }}>
                        {panelDef.rows.map((row) => {
                            const val = getPreviewValue(row.key);
                            if (!val) return null;
                            const truncated = String(val).length > 70 ? String(val).substring(0, 70) + "…" : val;
                            if (layout === "block") return (
                                <div key={row.key} style={{ marginBottom: "4px" }}>
                                    <div style={{ fontWeight: 700, textTransform: "uppercase" }}>{row.label} :-</div>
                                    <div style={{ color: "#1e293b", paddingLeft: "8px" }}>{truncated}</div>
                                </div>
                            );
                            if (layout === "center") return (
                                <div key={row.key} style={{ marginBottom: "4px", textAlign: "center" }}>
                                    <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{row.label} :- </span>
                                    <span style={{ color: "#1e293b" }}>{truncated}</span>
                                </div>
                            );
                            if (layout === "justify") return (
                                <div key={row.key} style={{ marginBottom: "4px", textAlign: "justify" }}>
                                    <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{row.label} :- </span>
                                    <span style={{ color: "#1e293b" }}>{truncated}</span>
                                </div>
                            );
                            if (layout === "table") return (
                                <div key={row.key} style={{ marginBottom: "4px", display: "flex", gap: "4px" }}>
                                    <span style={{ fontWeight: 700, textTransform: "uppercase", minWidth: "110px", flexShrink: 0 }}>{row.label}</span>
                                    <span style={{ fontWeight: 700, flexShrink: 0 }}>:-</span>
                                    <span style={{ color: "#1e293b" }}>{truncated}</span>
                                </div>
                            );
                            // default: inline
                            return (
                                <div key={row.key} style={{ marginBottom: "4px" }}>
                                    <span style={{ fontWeight: 700, textTransform: "uppercase" }}>{row.label} :- </span>
                                    <span style={{ color: "#1e293b" }}>{truncated}</span>
                                </div>
                            );
                        })}
                    </div>
                );
            }

            // IMPRESSION panel preview
            if (panelDef.panelType === "usg_impression") {
                const val = getPreviewValue("usg_impression");
                const fs = section.styles?.fontSize || "9px";
                const lh = section.styles?.lineHeight || "1.5";
                const layout = section.styles?.fieldLayout || "inline";
                const truncated = val ? (String(val).length > 80 ? String(val).substring(0, 80) + "…" : val) : null;
                const placeholder = <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No impression recorded.</span>;
                return (
                    <div className="w-full h-full overflow-hidden p-1.5" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: fs, lineHeight: lh, color: "#0a0a0a", textAlign: layout === "center" ? "center" : layout === "justify" ? "justify" : undefined }}>
                        {layout === "block" ? (
                            <><div style={{ fontWeight: 700, textTransform: "uppercase" }}>Impression :-</div><div style={{ paddingLeft: "8px" }}>{truncated || placeholder}</div></>
                        ) : layout === "table" ? (
                            <div style={{ display: "flex", gap: "4px" }}>
                                <span style={{ fontWeight: 700, textTransform: "uppercase", minWidth: "110px", flexShrink: 0 }}>IMPRESSION</span>
                                <span style={{ fontWeight: 700, flexShrink: 0 }}>:-</span>
                                <span>{truncated || placeholder}</span>
                            </div>
                        ) : (
                            <><span style={{ fontWeight: 700, textTransform: "uppercase" }}>Impression :- </span><span>{truncated || placeholder}</span></>
                        )}
                    </div>
                );
            }

            // SUGGESTION panel preview
            if (panelDef.panelType === "usg_suggestion") {
                const val = getPreviewValue("usg_suggestion");
                const fs = section.styles?.fontSize || "9px";
                const lh = section.styles?.lineHeight || "1.5";
                const layout = section.styles?.fieldLayout || "inline";
                const truncated = val ? (String(val).length > 80 ? String(val).substring(0, 80) + "…" : val) : null;
                const placeholder = <span style={{ color: "#94a3b8" }}>No suggestion recorded.</span>;
                return (
                    <div className="w-full h-full overflow-hidden p-1.5" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: fs, lineHeight: lh, color: "#0a0a0a", textAlign: layout === "center" ? "center" : layout === "justify" ? "justify" : undefined }}>
                        {layout === "block" ? (
                            <><div style={{ fontWeight: 700, textTransform: "uppercase" }}>Suggestion :-</div><div style={{ paddingLeft: "8px", fontStyle: "italic" }}>{truncated || placeholder}</div></>
                        ) : layout === "table" ? (
                            <div style={{ display: "flex", gap: "4px" }}>
                                <span style={{ fontWeight: 700, textTransform: "uppercase", minWidth: "110px", flexShrink: 0 }}>SUGGESTION</span>
                                <span style={{ fontWeight: 700, flexShrink: 0 }}>:-</span>
                                <span style={{ fontStyle: "italic" }}>{truncated || placeholder}</span>
                            </div>
                        ) : (
                            <><span style={{ fontWeight: 700, textTransform: "uppercase" }}>Suggestion :- </span><span style={{ fontStyle: "italic" }}>{truncated || placeholder}</span></>
                        )}
                    </div>
                );
            }


            // Test-type panel: 3 or 4-column table
            const showRefRange = !panelDef.hideRefRange;
            const ROW_H = 22;
            const HEADER_H = 28;
            return (
                <div className="w-full h-full overflow-hidden" style={{ fontSize: "10px" }}>
                    <div className="font-bold text-xs mb-1 px-1" style={{ color: "#1a1a2e" }}>{panelDef.label}</div>
                    <table className="w-full border-collapse" style={{ tableLayout: "fixed", background: "transparent" }}>
                        <thead>
                            <tr style={{ height: HEADER_H, background: "rgba(232,234,246,0.5)" }}>
                                <th className="text-left px-1.5 py-0.5 border border-slate-300/60 font-semibold" style={{ width: showRefRange ? "35%" : "50%" }}>Test</th>
                                <th className="text-center px-1.5 py-0.5 border border-slate-300/60 font-semibold" style={{ width: showRefRange ? "20%" : "25%" }}>Result</th>
                                <th className="text-center px-1.5 py-0.5 border border-slate-300/60 font-semibold" style={{ width: showRefRange ? "20%" : "25%" }}>Unit</th>
                                {showRefRange && <th className="text-center px-1.5 py-0.5 border border-slate-300/60 font-semibold" style={{ width: "25%" }}>Ref. Range</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {panelDef.rows.map((row, i) => (
                                <tr key={row.key} style={{ height: ROW_H, background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.03)" }}>
                                    <td className="px-1.5 py-0.5 border border-slate-200/50 font-medium">{row.label}</td>
                                    <td className="text-center px-1.5 py-0.5 border border-slate-200/50 font-semibold" style={{ color: "#1565c0" }}>{getPreviewValue(row.key)}</td>
                                    <td className="text-center px-1.5 py-0.5 border border-slate-200/50 text-muted-foreground">{row.unit}</td>
                                    {showRefRange && <td className="text-center px-1.5 py-0.5 border border-slate-200/50 text-muted-foreground">{getDynamicRefRange(row.key, row.label, row.refRange || "-")}</td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }
        return <div className="text-xs text-red-500">Unknown</div>;
    };

    // Group fields by category
    const fieldsByCategory: Record<string, typeof config.fields> = {};
    config.fields.forEach(f => {
        const cat = f.category || "Other";
        if (!fieldsByCategory[cat]) fieldsByCategory[cat] = [];
        fieldsByCategory[cat].push(f);
    });

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
            <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">{config.title}</h2>
                        <p className="text-sm text-muted-foreground">{config.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
                        <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}><ZoomIn className="w-4 h-4" /></Button>
                        <Button
                            variant={showGrid ? "default" : "outline"}
                            size="icon"
                            onClick={() => setShowGrid(!showGrid)}
                            title={showGrid ? "Hide Grid" : "Show Grid"}
                        >
                            <LayoutTemplate className="w-4 h-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-6" />
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setZoom(0.65)}>Fit</Button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setLayout([])}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                    </Button>
                    <div className="relative">
                        <Button variant="outline" size="sm" className="pointer-events-none">
                            <Upload className="w-3.5 h-3.5 mr-1.5" /> Import
                        </Button>
                        <Input
                            type="file"
                            accept=".json"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            onChange={handleImport}
                            title="Import JSON Layout"
                        />
                    </div>
                    <Button size="sm" onClick={handleSave}>
                        <Save className="w-3.5 h-3.5 mr-1.5" /> Save Layout
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Sidebar */}
                <div className="w-72 flex flex-col gap-4 border-r pr-4 overflow-y-auto">
                    <Tabs defaultValue="fields" className="w-full">
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="fields">Fields</TabsTrigger>
                            <TabsTrigger value="edit" disabled={!selectedId}>Properties</TabsTrigger>
                        </TabsList>
                        <TabsContent value="fields" className="space-y-4 mt-4">
                            {Object.entries(fieldsByCategory).map(([category, fields]) => (
                                <div key={category} className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">{category}</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {fields.map(field => (
                                            <Button
                                                key={field.key}
                                                variant="outline"
                                                size="sm"
                                                className="justify-start h-auto py-1.5 px-2 text-[11px]"
                                                onClick={() => addSection("field", field.key, field.width)}
                                            >
                                                <field.icon className="w-3 h-3 mr-1 shrink-0" />
                                                <span className="truncate">{field.label}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <Separator />

                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase">Components</p>
                                <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => addSection("text")}>
                                    <Type className="w-4 h-4 mr-2" /> Text Block
                                </Button>
                                <Button variant="secondary" size="sm" className="w-full justify-start" onClick={() => addSection("image")}>
                                    <ImageIcon className="w-4 h-4 mr-2" /> Logo / Image
                                </Button>
                                <Button
                                    variant="secondary" size="sm" className="w-full justify-start"
                                    onClick={() => {
                                        let startY = 100;
                                        if (scrollContainerRef.current) startY = (scrollContainerRef.current.scrollTop + 150) / zoom;
                                        const s: DocumentSection = { id: generateId("rect_sharp"), type: "rect_sharp", isVisible: true, label: "Rectangle (Sharp)", x: 40, y: startY, width: 300, height: 80, styles: { borderColor: "#1e293b", borderWidth: "1", borderStyle: "solid", fillColor: "transparent", fillOpacity: "1", borderRadius: "0px" } };
                                        setLayout([...layout, s]); setSelectedId(s.id);
                                    }}
                                >
                                    <Square className="w-4 h-4 mr-2" /> Sharp Box
                                </Button>
                                <Button
                                    variant="secondary" size="sm" className="w-full justify-start"
                                    onClick={() => {
                                        let startY = 100;
                                        if (scrollContainerRef.current) startY = (scrollContainerRef.current.scrollTop + 150) / zoom;
                                        const s: DocumentSection = { id: generateId("rect_round"), type: "rect_round", isVisible: true, label: "Rectangle (Rounded)", x: 40, y: startY, width: 300, height: 80, styles: { borderColor: "#1e293b", borderWidth: "1", borderStyle: "solid", fillColor: "transparent", fillOpacity: "1", borderRadius: "12px" } };
                                        setLayout([...layout, s]); setSelectedId(s.id);
                                    }}
                                >
                                    <Square className="w-4 h-4 mr-2 rounded-sm" /> Round Box
                                </Button>
                            </div>

                            {config.panels && config.panels.length > 0 && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase">Test Panels</p>
                                        {config.panels.filter(p => p.key !== "customer_details" && p.key !== "essential_patient_details").map(panel => (
                                            <Button
                                                key={panel.key}
                                                variant="secondary"
                                                size="sm"
                                                className="w-full justify-start"
                                                onClick={() => addPanel(panel)}
                                            >
                                                <panel.icon className="w-4 h-4 mr-2" />
                                                {panel.label}
                                            </Button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </TabsContent>
                        <TabsContent value="edit" className="space-y-4 mt-4">
                            {selectedSection ? (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label>Label</Label>
                                        <Input value={selectedSection.label} onChange={(e) => updateSection(selectedSection.id, { label: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label>X Position (px)</Label>
                                            <Input type="number" value={Math.round(selectedSection.x || 0)} onChange={(e) => updateSection(selectedSection.id, { x: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Y Position (px)</Label>
                                            <Input type="number" value={Math.round(selectedSection.y || 0)} onChange={(e) => updateSection(selectedSection.id, { y: parseInt(e.target.value) || 0 })} />
                                        </div>
                                    </div>
                                    {(() => {
                                        const FLOW_FIELD_KEYS = new Set(["cycleTimeline", "summary", "notes", "remarks"]);
                                        const isBodyFlowItem = selectedSection.position === "body" ||
                                            (!selectedSection.position && selectedSection.type === "panel") ||
                                            (selectedSection.type === "field" && FLOW_FIELD_KEYS.has(selectedSection.field || ""));
                                        if (!isBodyFlowItem) return null;
                                        return (
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                                    ⚡ Body items flow automatically. Use buttons to reorder; Space Before to add gap.
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" className="flex-1 flex items-center gap-1 text-xs" onClick={() => moveBodyPanel(selectedSection.id, "up")}>
                                                        <ChevronUp className="w-3 h-3" /> Move Up
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="flex-1 flex items-center gap-1 text-xs" onClick={() => moveBodyPanel(selectedSection.id, "down")}>
                                                        Move Down <ChevronDown className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label>Space Before (px)</Label>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            size="sm" variant="outline"
                                                            className="h-8 w-8 p-0 text-lg font-bold shrink-0"
                                                            onClick={() => updateSection(selectedSection.id, { marginTop: (selectedSection.marginTop ?? 0) - 1 })}
                                                        >−</Button>
                                                        <Input
                                                            type="number"
                                                            value={selectedSection.marginTop ?? 0}
                                                            min={-200}
                                                            max={300}
                                                            className="h-8 text-center px-1"
                                                            onChange={(e) => updateSection(selectedSection.id, { marginTop: parseInt(e.target.value) || 0 })}
                                                        />
                                                        <Button
                                                            size="sm" variant="outline"
                                                            className="h-8 w-8 p-0 text-lg font-bold shrink-0"
                                                            onClick={() => updateSection(selectedSection.id, { marginTop: Math.min(300, (selectedSection.marginTop ?? 0) + 1) })}
                                                        >+</Button>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground">Extra gap above this panel (px)</p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <div className="space-y-1">
                                        <Label>Width (px)</Label>
                                        <Input
                                            type="number"
                                            value={localWidth}
                                            onChange={(e) => setLocalWidth(e.target.value)}
                                            onBlur={() => {
                                                const v = parseInt(localWidth);
                                                if (!isNaN(v) && v > 0) updateSection(selectedSection.id, { width: v });
                                                else setLocalWidth(selectedSection.width != null ? String(selectedSection.width) : "");
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    const v = parseInt(localWidth);
                                                    if (!isNaN(v) && v > 0) updateSection(selectedSection.id, { width: v });
                                                    (e.target as HTMLInputElement).blur();
                                                }
                                            }}
                                            placeholder="Width"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Height (px)</Label>
                                        <Input
                                            type="number"
                                            value={localHeight}
                                            onChange={(e) => setLocalHeight(e.target.value)}
                                            onBlur={() => {
                                                const v = parseInt(localHeight);
                                                if (!isNaN(v) && v > 0) updateSection(selectedSection.id, { height: v });
                                                else if (localHeight === "" || localHeight === "0") updateSection(selectedSection.id, { height: undefined });
                                                else setLocalHeight(selectedSection.height != null ? String(selectedSection.height) : "");
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    const v = parseInt(localHeight);
                                                    if (!isNaN(v) && v > 0) updateSection(selectedSection.id, { height: v });
                                                    else updateSection(selectedSection.id, { height: undefined });
                                                    (e.target as HTMLInputElement).blur();
                                                }
                                            }}
                                            placeholder="Auto"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between pt-1 pb-1 border-t border-b border-slate-100 my-2">
                                        <div>
                                            <Label className="text-xs font-semibold text-slate-800">Lock Size (Fixed Border)</Label>
                                            <p className="text-[10px] text-muted-foreground">Strictly use set size; clip overflow.</p>
                                        </div>
                                        <Switch
                                            checked={!!selectedSection.lockSize}
                                            onCheckedChange={(c) => updateSection(selectedSection.id, { lockSize: c })}
                                        />
                                    </div>

                                    {selectedSection.type === "text" && (
                                        <div className="space-y-1">
                                            <Label>Content</Label>
                                            <Textarea
                                                value={selectedSection.content || ""}
                                                onChange={(e) => updateSection(selectedSection.id, { content: e.target.value })}
                                                className="min-h-[100px]"
                                            />
                                        </div>
                                    )}

                                    {(selectedSection.type === "rect_sharp" || selectedSection.type === "rect_round") && (
                                        <div className="space-y-3 border-t pt-3">
                                            <Label className="text-xs font-semibold text-slate-700">🔲 Rectangle Style</Label>
                                            <div className="space-y-2">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Border Color</Label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={selectedSection.styles?.borderColor || "#1e293b"}
                                                            onChange={(e) => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, borderColor: e.target.value } })}
                                                            className="h-8 w-10 rounded cursor-pointer border border-slate-200 p-0.5"
                                                        />
                                                        <Input
                                                            value={selectedSection.styles?.borderColor || "#1e293b"}
                                                            onChange={(e) => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, borderColor: e.target.value } })}
                                                            className="h-8 font-mono text-xs"
                                                            placeholder="#1e293b"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Border Width (px)</Label>
                                                    <div className="flex items-center gap-1">
                                                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 font-bold shrink-0"
                                                            onClick={() => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, borderWidth: String(Math.max(0, parseInt(selectedSection.styles?.borderWidth || "1") - 1)) } })}
                                                        >−</Button>
                                                        <Input type="number" min="0" max="20"
                                                            value={selectedSection.styles?.borderWidth || "1"}
                                                            className="h-8 text-center px-1"
                                                            onChange={(e) => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, borderWidth: e.target.value } })}
                                                        />
                                                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 font-bold shrink-0"
                                                            onClick={() => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, borderWidth: String(Math.min(20, parseInt(selectedSection.styles?.borderWidth || "1") + 1)) } })}
                                                        >+</Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Border Style</Label>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        {(["solid", "dashed", "dotted"] as const).map(bs => (
                                                            <button key={bs}
                                                                onClick={() => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, borderStyle: bs } })}
                                                                className={["rounded border py-1 text-[10px] capitalize transition-all",
                                                                    (selectedSection.styles?.borderStyle || "solid") === bs
                                                                        ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                                                                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"
                                                                ].join(" ")}
                                                            >{bs}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                {selectedSection.type === "rect_round" && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Corner Radius (px)</Label>
                                                        <div className="flex items-center gap-1">
                                                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 font-bold shrink-0"
                                                                onClick={() => {
                                                                    const cur = parseInt(selectedSection.styles?.borderRadius || "12");
                                                                    updateSection(selectedSection.id, { styles: { ...selectedSection.styles, borderRadius: `${Math.max(0, cur - 2)}px` } });
                                                                }}
                                                            >−</Button>
                                                            <Input type="number" min="0" max="200"
                                                                value={parseInt(selectedSection.styles?.borderRadius || "12")}
                                                                className="h-8 text-center px-1"
                                                                onChange={(e) => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, borderRadius: `${e.target.value}px` } })}
                                                            />
                                                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 font-bold shrink-0"
                                                                onClick={() => {
                                                                    const cur = parseInt(selectedSection.styles?.borderRadius || "12");
                                                                    updateSection(selectedSection.id, { styles: { ...selectedSection.styles, borderRadius: `${Math.min(200, cur + 2)}px` } });
                                                                }}
                                                            >+</Button>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Fill Color</Label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={selectedSection.styles?.fillColor === "transparent" || !selectedSection.styles?.fillColor ? "#ffffff" : selectedSection.styles.fillColor}
                                                            onChange={(e) => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, fillColor: e.target.value } })}
                                                            className="h-8 w-10 rounded cursor-pointer border border-slate-200 p-0.5"
                                                        />
                                                        <Input
                                                            value={selectedSection.styles?.fillColor || "transparent"}
                                                            onChange={(e) => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, fillColor: e.target.value } })}
                                                            className="h-8 font-mono text-xs"
                                                            placeholder="transparent"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Fill Opacity ({Math.round(parseFloat(selectedSection.styles?.fillOpacity || "1") * 100)}%)</Label>
                                                    <input
                                                        type="range" min="0" max="1" step="0.05"
                                                        value={selectedSection.styles?.fillOpacity || "1"}
                                                        className="w-full h-2 accent-blue-500"
                                                        onChange={(e) => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, fillOpacity: e.target.value } })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <Label>Font Size (px)</Label>
                                        <Input
                                            type="number"
                                            value={selectedSection.styles?.fontSize?.replace('px', '') || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                updateSection(selectedSection.id, {
                                                    styles: { ...selectedSection.styles, fontSize: val ? `${val}px` : "" }
                                                });
                                            }}
                                            placeholder="Inherit"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Font Weight</Label>
                                        <Input
                                            value={selectedSection.styles?.fontWeight || ""}
                                            onChange={(e) => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, fontWeight: e.target.value } })}
                                            placeholder="bold, 500, etc"
                                        />
                                    </div>
                                    {(() => {
                                        const panelDef = selectedSection.type === "panel" && selectedSection.panelKey
                                            ? config.panels?.find(p => p.key === selectedSection.panelKey)
                                            : null;
                                        const isUsgPanel = panelDef?.panelType === "usg" || panelDef?.panelType === "usg_impression" || panelDef?.panelType === "usg_suggestion";
                                        if (!isUsgPanel) return null;
                                        const currentLayout = selectedSection.styles?.fieldLayout || "inline";
                                        const layouts: { value: string; label: string; icon: string; title: string }[] = [
                                            { value: "inline",  label: "Inline",  icon: "▬",  title: "Label :- value on same line" },
                                            { value: "block",   label: "Block",   icon: "☰",  title: "Label on top, value below" },
                                            { value: "center",  label: "Centre",  icon: "≡",  title: "Centred alignment" },
                                            { value: "justify", label: "Justify", icon: "▤",  title: "Justified text" },
                                            { value: "table",   label: "Table",   icon: "⊞",  title: "Fixed label column, neat table look" },
                                        ];
                                        return (
                                            <div className="space-y-1 border-t pt-3">
                                                <Label className="text-xs font-semibold text-slate-700">📐 USG Spacing</Label>
                                                <div className="space-y-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Line Spacing</Label>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                size="sm" variant="outline"
                                                                className="h-8 w-8 p-0 text-base font-bold shrink-0"
                                                                onClick={() => {
                                                                    const cur = parseFloat(selectedSection.styles?.lineHeight || "1.7");
                                                                    updateSection(selectedSection.id, { styles: { ...selectedSection.styles, lineHeight: String(Math.max(1.0, parseFloat((cur - 0.1).toFixed(1)))) } });
                                                                }}
                                                            >−</Button>
                                                            <Input
                                                                type="number"
                                                                step="0.1"
                                                                min="1.0"
                                                                max="4.0"
                                                                value={selectedSection.styles?.lineHeight || "1.7"}
                                                                className="h-8 text-center px-1"
                                                                onChange={(e) => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, lineHeight: e.target.value } })}
                                                            />
                                                            <Button
                                                                size="sm" variant="outline"
                                                                className="h-8 w-8 p-0 text-base font-bold shrink-0"
                                                                onClick={() => {
                                                                    const cur = parseFloat(selectedSection.styles?.lineHeight || "1.7");
                                                                    updateSection(selectedSection.id, { styles: { ...selectedSection.styles, lineHeight: String(Math.min(4.0, parseFloat((cur + 0.1).toFixed(1)))) } });
                                                                }}
                                                            >+</Button>
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground">Spacing between lines (e.g. 1.7)</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Row Gap (px)</Label>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                size="sm" variant="outline"
                                                                className="h-8 w-8 p-0 text-base font-bold shrink-0"
                                                                onClick={() => {
                                                                    const cur = parseInt(selectedSection.styles?.rowGap || "8");
                                                                    updateSection(selectedSection.id, { styles: { ...selectedSection.styles, rowGap: String(Math.max(0, cur - 1)) } });
                                                                }}
                                                            >−</Button>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="60"
                                                                value={selectedSection.styles?.rowGap || "8"}
                                                                className="h-8 text-center px-1"
                                                                onChange={(e) => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, rowGap: e.target.value } })}
                                                            />
                                                            <Button
                                                                size="sm" variant="outline"
                                                                className="h-8 w-8 p-0 text-base font-bold shrink-0"
                                                                onClick={() => {
                                                                    const cur = parseInt(selectedSection.styles?.rowGap || "8");
                                                                    updateSection(selectedSection.id, { styles: { ...selectedSection.styles, rowGap: String(Math.min(60, cur + 1)) } });
                                                                }}
                                                            >+</Button>
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground">Space below each organ row (px)</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">Field Alignment</Label>
                                                        <div className="grid grid-cols-5 gap-1">
                                                            {layouts.map(opt => (
                                                                <button
                                                                    key={opt.value}
                                                                    title={opt.title}
                                                                    onClick={() => updateSection(selectedSection.id, { styles: { ...selectedSection.styles, fieldLayout: opt.value } })}
                                                                    className={[
                                                                        "flex flex-col items-center justify-center gap-0.5 rounded border py-1.5 text-[10px] transition-all",
                                                                        currentLayout === opt.value
                                                                            ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold shadow-sm"
                                                                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50"
                                                                    ].join(" ")}
                                                                >
                                                                    <span className="text-base leading-none">{opt.icon}</span>
                                                                    <span>{opt.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground">How label &amp; value are displayed per row</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="space-y-1">
                                        <Label>Section Type</Label>
                                        <Select
                                            value={selectedSection.position || (selectedSection.type === "panel" && config.panels?.find(p => p.key === selectedSection.panelKey)?.panelType !== "info" ? "body" : "header")}
                                            onValueChange={(val: any) => updateSection(selectedSection.id, { position: val })}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="header">Header (Fixed)</SelectItem>
                                                <SelectItem value="body">Body (Flowing)</SelectItem>
                                                <SelectItem value="footer">Footer (Bottom)</SelectItem>
                                                <SelectItem value="category">Category Label</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground">Header/Footer are fixed. Body items stack automatically.</p>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <Label>Visible</Label>
                                        <Switch checked={selectedSection.isVisible} onCheckedChange={(c) => updateSection(selectedSection.id, { isVisible: c })} />
                                    </div>
                                    <Button variant="destructive" size="sm" className="w-full mt-4" onClick={() => removeSection(selectedSection.id)}>
                                        <Trash2 className="w-4 h-4 mr-2" /> Remove
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Select an element to edit</p>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Canvas Workspace */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 bg-muted/20 overflow-auto relative flex justify-center p-8"
                >
                    <div
                        className="bg-white shadow-2xl relative transition-transform origin-top"
                        style={{
                            width: A4_WIDTH_PX,
                            height: A4_HEIGHT_PX,
                            transform: `scale(${zoom})`,
                            backgroundImage: settings[config.backgroundSettingKey] ? `url(${settings[config.backgroundSettingKey]})` : undefined,
                            backgroundSize: "100% 100%",
                            backgroundPosition: "center",
                        }}
                        onClick={() => setSelectedId(null)}
                    >
                        {showGrid && (
                            <div
                                className="absolute inset-0 pointer-events-none z-0"
                                style={{
                                    backgroundImage: `linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)`,
                                    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
                                }}
                            />
                        )}

                        {!settings[config.backgroundSettingKey] && (
                            <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center text-6xl font-black uppercase text-slate-300">
                                Letterhead
                            </div>
                        )}

                        {layout.filter(s => s.isVisible).map(section => (
                            <DraggableComponent
                                key={section.id}
                                section={section as any}
                                isSelected={selectedId === section.id}
                                onSelect={() => setSelectedId(section.id)}
                                onUpdate={(updates) => {
                                    const newLayout = layout.map(s =>
                                        s.id === section.id ? { ...s, ...updates } : s
                                    );
                                    setLayout(newLayout as DocumentSection[]);
                                }}
                                onRemove={() => {
                                    setLayout(layout.filter(s => s.id !== section.id));
                                    setSelectedId(null);
                                }}
                                zoomScale={zoom}
                                gridSize={showGrid ? GRID_SIZE : 0}
                            >
                                <div
                                    className="w-full h-full"
                                    style={{
                                        fontSize: section.styles?.fontSize,
                                        fontWeight: section.styles?.fontWeight,
                                        color: section.styles?.color,
                                    }}
                                >
                                    {renderDesignerContent(section)}
                                </div>
                            </DraggableComponent>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
