
export type SectionType = "header" | "grid" | "table" | "totals" | "text" | "payment" | "footer" | "spacer" | "stamp" | "image" | "field";

export type InvoiceFieldKey =
    | "invoiceNumber"
    | "date"
    | "dueDate"
    | "customerName"
    | "customerAddress"
    | "customerPhone"
    | "customerEmail" // Added
    | "total"
    | "subtotal"
    | "tax"
    | "doctorName"
    | "doctorPhone"
    | "billedBy"
    | "bankName"
    | "upiId"
    | "upiPhone" // Added
    | "clinicPhone"
    | "gstNumber"
    | "regNumber"
    | "patientName"
    | "ownerName"
    | "serialNumber" // Auto-increment or custom?
    | "terms"
    | "qrCode"
    | "description" // Product Name
    | "unitPrice" // Price
    | "quantity" // Qty
    | "lineTotal"; // Subtotal

export interface InvoiceSection {
    id: string;
    type: SectionType;
    isVisible: boolean;
    label: string;
    styles?: Record<string, string>;
    content?: string;
    children?: string[];
    // Canvas positioning
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    // For single fields
    field?: InvoiceFieldKey;
}
