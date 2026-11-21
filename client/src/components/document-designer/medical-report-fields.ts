import {
    User, Calendar, Hash, Phone,
    FileText, Stethoscope, ClipboardList,
    Pill, Activity, Ruler, NotebookPen
} from "lucide-react";
import type { DocumentDesignerConfig, DocumentField } from "./types";

const MEDICAL_REPORT_FIELDS: DocumentField[] = [
    // Report & Clinic Info
    { key: "clinicName", label: "Clinic Name", icon: Hash, category: "Report Info" },
    { key: "reportDate", label: "Report Date", icon: Calendar, category: "Report Info" },
    { key: "recordId", label: "Record ID", icon: Hash, category: "Report Info" },
    { key: "doctorName", label: "Doctor Name", icon: Stethoscope, category: "Report Info" },

    // Patient Info
    { key: "patientName", label: "Patient Name", icon: User, category: "Patient Info" },
    { key: "ownerName", label: "Owner Name", icon: User, category: "Patient Info" },
    { key: "ownerPhone", label: "Owner Phone", icon: Phone, category: "Patient Info" },
    { key: "species", label: "Species", icon: Activity, category: "Patient Info" },
    { key: "breed", label: "Breed", icon: Activity, category: "Patient Info" },
    { key: "age", label: "Age", icon: Calendar, category: "Patient Info" },
    { key: "weight", label: "Weight", icon: Ruler, category: "Patient Info" },
    { key: "gender", label: "Gender", icon: User, category: "Patient Info" },

    // SOAP Notes
    { key: "subjective", label: "Subjective", icon: NotebookPen, width: 700, category: "SOAP Notes" },
    { key: "objective", label: "Objective", icon: ClipboardList, width: 700, category: "SOAP Notes" },
    { key: "assessment", label: "Assessment / Diagnosis", icon: Stethoscope, width: 700, category: "SOAP Notes" },
    { key: "plan", label: "Plan / Treatment", icon: ClipboardList, width: 700, category: "SOAP Notes" },

    // Clinical Details
    { key: "diagnosis", label: "Diagnosis", icon: Stethoscope, width: 500, category: "Clinical" },
    { key: "treatment", label: "Treatment", icon: Pill, width: 500, category: "Clinical" },
    { key: "prescription", label: "Prescription", icon: Pill, width: 500, category: "Clinical" },
    { key: "notes", label: "Clinical Notes", icon: FileText, width: 700, category: "Clinical" },
    { key: "followUp", label: "Follow-up Date", icon: Calendar, category: "Clinical" },
    { key: "vitals", label: "Vitals Summary", icon: Activity, width: 500, category: "Clinical" },

    // Signatures
    { key: "doctorSig", label: "Doctor Signature", icon: User, category: "Other" },
    { key: "ownerSig", label: "Owner Signature", icon: User, category: "Other" },
];

const MEDICAL_PREVIEW: Record<string, string> = {
    clinicName: "ABC Veterinary Clinic",
    reportDate: "15/02/2026",
    recordId: "MR-0042",
    doctorName: "Dr. Varsha",
    patientName: "Bruno",
    ownerName: "Rahul Sharma",
    ownerPhone: "+91 98765 43210",
    species: "Canine",
    breed: "Labrador",
    age: "4 years",
    weight: "32.5 kg",
    gender: "Male",
    subjective: "Owner reports decreased appetite for 2 days, mild lethargy.",
    objective: "Temp: 101.5°F, HR: 90 bpm, RR: 22, Hydration: Normal. Mild tenderness on abdominal palpation.",
    assessment: "Mild gastritis, likely dietary indiscretion",
    plan: "NPO for 12 hours, bland diet for 5 days, Omeprazole 1mg/kg SID x 5 days. Recheck if no improvement in 3 days.",
    diagnosis: "Mild Gastritis",
    treatment: "Supportive care + Omeprazole",
    prescription: "Omeprazole 20mg - 1 tab daily x 5 days\nMetoclopramide 5mg - as needed",
    notes: "Monitor stool consistency. Return if vomiting persists.",
    followUp: "20/02/2026",
    vitals: "T: 101.5°F | HR: 90 | RR: 22 | Wt: 32.5kg",
    doctorSig: "Dr. Varsha",
    ownerSig: "Rahul Sharma",
};

export const medicalReportConfig: DocumentDesignerConfig = {
    title: "Medical Report Canvas",
    subtitle: "Click fields to add them to your medical report template.",
    fields: MEDICAL_REPORT_FIELDS,
    components: [],
    previewValues: MEDICAL_PREVIEW,
    backgroundSettingKey: "medicalReportBackgroundImage",
    layoutSettingKey: "medicalReportLayout",
};
