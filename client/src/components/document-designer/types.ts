
export type DocumentSectionType = "field" | "text" | "image" | "table" | "spacer" | "panel";

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
    panelType?: "test" | "info";  // "test" = 4-col table, "info" = label:value pairs
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
    field?: string;
    panelKey?: string;
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

