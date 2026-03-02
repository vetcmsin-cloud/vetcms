import { useState, useRef, useEffect } from "react";
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
    Download, Upload
} from "lucide-react";
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
        const previewSpecies = "Dog";

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

    const setLayout = (newLayout: DocumentSection[]) => {
        if (onLayoutChange) {
            onLayoutChange(newLayout);
        } else {
            setInternalLayout(newLayout);
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
            label: fieldDef ? fieldDef.label : (type === "text" ? "Text Block" : type === "image" ? "Logo / Image" : `New ${type}`),
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
        setLayout(layout.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const removeSection = (id: string) => {
        setLayout(layout.filter(s => s.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const selectedSection = layout.find(s => s.id === selectedId);

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
                    <div className="w-full h-full overflow-hidden flex flex-col" style={{ fontSize: "11px" }}>
                        <div className="font-bold text-xs mb-2 px-1 border-b pb-1" style={{ color: "#1a1a2e" }}>{panelDef.label}</div>
                        <div className={`grid ${hasRightColumn ? "grid-cols-2 gap-4" : "grid-cols-1"} px-1`}>
                            {/* Left Column */}
                            <div className="space-y-0.5">
                                {leftRows.map(row => (
                                    <div key={row.key} className="flex items-baseline gap-1" style={{ lineHeight: "1.7" }}>
                                        <span className="font-medium text-slate-700 whitespace-nowrap" style={{ minWidth: "100px" }}>{row.label}</span>
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
                                            <span className="font-medium text-slate-700 whitespace-nowrap" style={{ minWidth: "100px" }}>{row.label}</span>
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

            // Test-type panel: 4-column table
            const ROW_H = 22;
            const HEADER_H = 28;
            return (
                <div className="w-full h-full overflow-hidden" style={{ fontSize: "10px" }}>
                    <div className="font-bold text-xs mb-1 px-1" style={{ color: "#1a1a2e" }}>{panelDef.label}</div>
                    <table className="w-full border-collapse" style={{ tableLayout: "fixed", background: "transparent" }}>
                        <thead>
                            <tr style={{ height: HEADER_H, background: "rgba(232,234,246,0.5)" }}>
                                <th className="text-left px-1.5 py-0.5 border border-slate-300/60 font-semibold" style={{ width: "35%" }}>Test</th>
                                <th className="text-center px-1.5 py-0.5 border border-slate-300/60 font-semibold" style={{ width: "20%" }}>Result</th>
                                <th className="text-center px-1.5 py-0.5 border border-slate-300/60 font-semibold" style={{ width: "20%" }}>Unit</th>
                                <th className="text-center px-1.5 py-0.5 border border-slate-300/60 font-semibold" style={{ width: "25%" }}>Ref. Range</th>
                            </tr>
                        </thead>
                        <tbody>
                            {panelDef.rows.map((row, i) => (
                                <tr key={row.key} style={{ height: ROW_H, background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.03)" }}>
                                    <td className="px-1.5 py-0.5 border border-slate-200/50 font-medium">{row.label}</td>
                                    <td className="text-center px-1.5 py-0.5 border border-slate-200/50 font-semibold" style={{ color: "#1565c0" }}>{getPreviewValue(row.key)}</td>
                                    <td className="text-center px-1.5 py-0.5 border border-slate-200/50 text-muted-foreground">{row.unit}</td>
                                    <td className="text-center px-1.5 py-0.5 border border-slate-200/50 text-muted-foreground">{getDynamicRefRange(row.key, row.label, row.refRange || "-")}</td>
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
                            </div>

                            {config.panels && config.panels.length > 0 && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase">Test Panels</p>
                                        {config.panels.map(panel => (
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
                                    <div className="space-y-1">
                                        <Label>Width (px)</Label>
                                        <Input type="number" value={selectedSection.width || ""} onChange={(e) => updateSection(selectedSection.id, { width: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Height (px)</Label>
                                        <Input type="number" value={selectedSection.height || ""} placeholder="Auto" onChange={(e) => updateSection(selectedSection.id, { height: parseInt(e.target.value) || undefined })} />
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

                                    <div className="space-y-1">
                                        <Label>Font Size (px)</Label>
                                        <Input
                                            type="number"
                                            value={selectedSection.styles?.fontSize?.replace('px', '') || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                updateSection(selectedSection.id, {
                                                    styles: { ...selectedSection.styles, fontSize: val ? `${val}px` : undefined }
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
