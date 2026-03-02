import {
    User, Calendar, Hash, Phone, Thermometer, Ruler,
    TestTubes, FileText, Beaker, Droplets, Activity,
    Syringe, Heart, Stethoscope, TableProperties
} from "lucide-react";
import type { DocumentDesignerConfig, DocumentField, PanelDefinition } from "./types";

const LAB_REPORT_FIELDS: DocumentField[] = [
    // Patient & Report Info
    { key: "clinicName", label: "Clinic Name", icon: Hash, category: "Report Info" },
    { key: "reportDate", label: "Report Date", icon: Calendar, category: "Report Info" },
    { key: "caseId", label: "Case ID", icon: Hash, category: "Report Info" },
    { key: "sampleType", label: "Sample Type", icon: TestTubes, category: "Report Info" },
    { key: "refDoctor", label: "Ref. Doctor", icon: Stethoscope, category: "Report Info" },

    { key: "patientName", label: "Patient Name", icon: User, category: "Patient Info" },
    { key: "ownerName", label: "Owner Name", icon: User, category: "Patient Info" },
    { key: "ownerPhone", label: "Owner Phone", icon: Phone, category: "Patient Info" },
    { key: "species", label: "Species", icon: Activity, category: "Patient Info" },
    { key: "breed", label: "Breed", icon: Activity, category: "Patient Info" },
    { key: "age", label: "Age", icon: Calendar, category: "Patient Info" },
    { key: "weight", label: "Weight", icon: Ruler, category: "Patient Info" },
    { key: "gender", label: "Gender", icon: User, category: "Patient Info" },

    // Other
    { key: "remarks", label: "Remarks / Interpretation", icon: FileText, width: 700, category: "Other" },
    { key: "pathologistSig", label: "Pathologist Signature", icon: User, category: "Other" },
    { key: "doctorSig", label: "Doctor Signature", icon: User, category: "Other" },
];

const LAB_PANELS: PanelDefinition[] = [
    {
        key: "customer_details",
        label: "Customer / Patient Details",
        icon: User,
        panelType: "info",
        defaultWidth: 700,
        defaultHeight: 200,
        rows: [
            // Left Column (Patient)
            { key: "patientName", label: "Animal Name", unit: "", refRange: "", col: "left" },
            { key: "species", label: "Species", unit: "", refRange: "", col: "left" },
            { key: "breed", label: "Breed", unit: "", refRange: "", col: "left" },
            { key: "ageSex", label: "Age / Sex", unit: "", refRange: "", col: "left" },
            { key: "weight", label: "Weight", unit: "", refRange: "", col: "left" },
            { key: "sampleType", label: "Sample Type", unit: "", refRange: "", col: "left" },

            // Right Column (Report/Owner)
            { key: "caseId", label: "Case ID", unit: "", refRange: "", col: "right" },
            { key: "reportDate", label: "Report Date", unit: "", refRange: "", col: "right" },
            { key: "refDoctor", label: "Ref. Doctor", unit: "", refRange: "", col: "right" },
            { key: "ownerName", label: "Owner Name", unit: "", refRange: "", col: "right" },
            { key: "ownerPhone", label: "Contact No", unit: "", refRange: "", col: "right" },
        ],
    },
    {
        key: "cbc_panel",
        label: "Hematology (CBC) Panel",
        icon: Droplets,
        defaultWidth: 700,
        defaultHeight: 400,
        rows: [
            { key: "rbc", label: "RBC", unit: "×10⁶/μL", refRange: "5.5 – 8.5" },
            { key: "hb", label: "Hemoglobin (Hb)", unit: "g/dL", refRange: "12 – 18" },
            { key: "pcv", label: "PCV (HCT)", unit: "%", refRange: "37 – 55" },
            { key: "wbc", label: "WBC", unit: "/μL", refRange: "6,000 – 17,000" },
            { key: "platelet", label: "Platelet Count", unit: "×10³/μL", refRange: "175 – 500" },
            { key: "mcv", label: "MCV", unit: "fL", refRange: "60 – 77" },
            { key: "mch", label: "MCH", unit: "pg", refRange: "20 – 25" },
            { key: "mchc", label: "MCHC", unit: "g/dL", refRange: "32 – 36" },
            { key: "neutrophils", label: "Neutrophils", unit: "%", refRange: "60 – 77" },
            { key: "lymphocytes", label: "Lymphocytes", unit: "%", refRange: "12 – 30" },
            { key: "monocytes", label: "Monocytes", unit: "%", refRange: "3 – 10" },
            { key: "eosinophils", label: "Eosinophils", unit: "%", refRange: "2 – 10" },
            { key: "basophils", label: "Basophils", unit: "%", refRange: "0 – 1" },
        ],
    },
    {
        key: "chemistry_panel",
        label: "Blood Chemistry Panel",
        icon: Syringe,
        defaultWidth: 700,
        defaultHeight: 470,
        rows: [
            { key: "glucose", label: "Glucose", unit: "mg/dL", refRange: "74 – 143" },
            { key: "urea", label: "Urea (BUN)", unit: "mg/dL", refRange: "7 – 27" },
            { key: "creatinine", label: "Creatinine", unit: "mg/dL", refRange: "0.5 – 1.8" },
            { key: "alt", label: "ALT (SGPT)", unit: "U/L", refRange: "10 – 125" },
            { key: "ast", label: "AST (SGOT)", unit: "U/L", refRange: "10 – 50" },
            { key: "alp", label: "ALP", unit: "U/L", refRange: "23 – 212" },
            { key: "totalProtein", label: "Total Protein", unit: "g/dL", refRange: "5.2 – 8.2" },
            { key: "albumin", label: "Albumin", unit: "g/dL", refRange: "2.3 – 4.0" },
            { key: "globulin", label: "Globulin", unit: "g/dL", refRange: "2.5 – 4.5" },
            { key: "totalBilirubin", label: "Total Bilirubin", unit: "mg/dL", refRange: "0.1 – 0.5" },
            { key: "sodium", label: "Sodium", unit: "mEq/L", refRange: "144 – 160" },
            { key: "potassium", label: "Potassium", unit: "mEq/L", refRange: "3.5 – 5.8" },
            { key: "chloride", label: "Chloride", unit: "mEq/L", refRange: "109 – 122" },
            { key: "calcium", label: "Calcium", unit: "mg/dL", refRange: "9.0 – 11.3" },
            { key: "phosphorus", label: "Phosphorus", unit: "mg/dL", refRange: "2.6 – 6.2" },
        ],
    },
    {
        key: "biochemistry_panel",
        label: "Biochemistry Panel",
        icon: Beaker,
        defaultWidth: 700,
        defaultHeight: 470,
        rows: [
            { key: "bio_glucose", label: "Glucose", unit: "mg/dL", refRange: "70 – 120" },
            { key: "bio_urea", label: "Urea (BUN)", unit: "mg/dL", refRange: "7 – 27" },
            { key: "bio_creatinine", label: "Creatinine", unit: "mg/dL", refRange: "0.5 – 1.5" },
            { key: "bio_alt", label: "ALT (SGPT)", unit: "U/L", refRange: "10 – 125" },
            { key: "bio_ast", label: "AST (SGOT)", unit: "U/L", refRange: "15 – 66" },
            { key: "bio_alp", label: "ALP", unit: "U/L", refRange: "20 – 150" },
            { key: "bio_totalProtein", label: "Total Protein", unit: "g/dL", refRange: "5.5 – 7.5" },
            { key: "bio_albumin", label: "Albumin", unit: "g/dL", refRange: "2.7 – 4.4" },
            { key: "bio_globulin", label: "Globulin", unit: "g/dL", refRange: "2.5 – 4.5" },
            { key: "bio_totalBilirubin", label: "Total Bilirubin", unit: "mg/dL", refRange: "0.1 – 0.6" },
            { key: "bio_sodium", label: "Sodium", unit: "mmol/L", refRange: "140 – 155" },
            { key: "bio_potassium", label: "Potassium", unit: "mmol/L", refRange: "3.5 – 5.8" },
            { key: "bio_chloride", label: "Chloride", unit: "mmol/L", refRange: "105 – 115" },
            { key: "bio_calcium", label: "Calcium", unit: "mg/dL", refRange: "9 – 11.5" },
            { key: "bio_phosphorus", label: "Phosphorus", unit: "mg/dL", refRange: "2.5 – 6.0" },
        ],
    },
];

const LAB_PREVIEW: Record<string, string> = {
    clinicName: "ABC Veterinary Clinic",
    reportDate: "15/02/2026",
    caseId: "LAB-0042",
    sampleType: "Whole Blood / Serum",
    refDoctor: "Dr. Varsha",
    patientName: "Bruno",
    ownerName: "Rahul Sharma",
    ownerPhone: "+91 98765 43210",
    species: "Dog",
    breed: "Labrador",
    age: "4 years",
    weight: "32.5 kg",
    gender: "Male",
    ageSex: "4 years / Male",
    rbc: "6.8", hb: "14.5", pcv: "42", wbc: "12,000", platelet: "350,000",
    mcv: "68", mch: "21", mchc: "34", neutrophils: "65", lymphocytes: "25",
    monocytes: "5", eosinophils: "4", basophils: "1",
    glucose: "95", urea: "18", creatinine: "1.0", alt: "45", ast: "35",
    alp: "80", totalProtein: "6.5", albumin: "3.2", globulin: "3.3",
    totalBilirubin: "0.3", sodium: "148", potassium: "4.5", chloride: "110",
    calcium: "10.2", phosphorus: "4.0",
    bio_glucose: "95", bio_urea: "18", bio_creatinine: "1.0", bio_alt: "45", bio_ast: "35",
    bio_alp: "80", bio_totalProtein: "6.5", bio_albumin: "3.2", bio_globulin: "3.3",
    bio_totalBilirubin: "0.3", bio_sodium: "148", bio_potassium: "4.5", bio_chloride: "110",
    bio_calcium: "10.2", bio_phosphorus: "4.0",
    remarks: "All values within normal range",
    pathologistSig: "Dr. Lab Pathologist",
    doctorSig: "Dr. Varsha",
};

export const DEFAULT_LAB_REPORT_TYPE = "Hematology";

export const LAB_REPORT_TYPES = [
    "Hematology",
    "Biochemistry",
    "Urinalysis",
    "Faecal Sample",
    "Imaging",
    "Rapid Tests",
    "Microbiology",
    "Endocrine",
    "Reproductive",
    "Hematology & Blood Chemistry",
    "Blood Chemistry"
] as const;

export type LabReportType = typeof LAB_REPORT_TYPES[number];

export const labReportConfig: DocumentDesignerConfig = {
    title: "Lab Report Canvas",
    subtitle: "Click fields to add them to your lab report template.",
    fields: LAB_REPORT_FIELDS,
    panels: LAB_PANELS,
    components: [],
    previewValues: LAB_PREVIEW,
    backgroundSettingKey: "labReportBackgroundImage",
    layoutSettingKey: "labReportLayout",
};
