
export type DocumentSectionType = "field" | "text" | "image" | "table" | "spacer" | "panel" | "usg" | "rect_sharp" | "rect_round";

export interface DocumentField {
    key: string;
    label: string;
    icon: any;
    width?: number;
    category?: string;
}

export interface PanelRow {
    key: string;
    label: string;
    unit: string;
    refRange: string;
    col?: "left" | "right";
}

export interface PanelDefinition {
    key: string;
    label: string;
    icon: any;
    panelType?: "test" | "info" | "blood_smear" | "wet_film" | "evc" | "progesterone" | "cycle_timeline" | "usg" | "usg_impression" | "usg_suggestion";  // "test" = 4-col table, "info" = label:value pairs, "blood_smear" = pathogen/count, "wet_film" = microfilaria/count, "evc" = vaginal cytology, "progesterone" = progesterone assay, "cycle_timeline" = reproductive cycle timeline, "usg" = ultrasonography findings, "usg_impression" = impression text block, "usg_suggestion" = suggestion text block
    rows: PanelRow[];
    defaultWidth?: number;
    defaultHeight?: number;
    hideRefRange?: boolean;
}

export interface DocumentSection {
    id: string;
    type: DocumentSectionType;
    isVisible: boolean;
    label: string;
    styles?: Record<string, string>;
    content?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    marginTop?: number;  // extra top spacing before this body flow item (px)
    lockSize?: boolean;
    field?: string;
    panelKey?: string;
    position?: "header" | "body" | "footer" | "category";
}

export interface DocumentDesignerConfig {
    title: string;
    subtitle: string;
    fields: DocumentField[];
    panels?: PanelDefinition[];
    components: { label: string; type: DocumentSectionType; icon: any; defaultWidth?: number }[];
    previewValues: Record<string, string>;
    backgroundSettingKey: string;
    layoutSettingKey: string;
}

