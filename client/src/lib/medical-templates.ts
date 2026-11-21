// Shared default treatment plan templates.
// These are the built-in templates used in SOAP note consultations.
// If an admin has not customized templates via Medical Settings, these are used as-is.
// Once any clinic-level save is made, the saved version takes over entirely.

export interface PlanTemplate {
  id: number;
  label: string;
  procedures: string;
  medications: string;
  instructions: string;
}

export const DEFAULT_PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 1,
    label: "Dehydration / IV Fluid Therapy",
    procedures: "IV catheter placement, PCV/TS, Blood glucose",
    medications: "LRS IV fluids at 50 ml/hr",
    instructions: "Administer IV fluids; re-evaluate vitals every 4 hours; monitor urine output; rehydrate and reassess.",
  },
  {
    id: 2,
    label: "Gastroenteritis",
    procedures: "Faecal exam, Blood panel, Parvo snap test",
    medications: "Metronidazole 15mg/kg BID x 5 days; Cerenia 1mg/kg SQ SID",
    instructions: "Bland diet (boiled chicken & rice) x 3-5 days; small frequent meals; ensure fresh water available.",
  },
  {
    id: 3,
    label: "Skin Infection / Pyoderma",
    procedures: "Skin scraping, Cytology",
    medications: "Amoxicillin-Clavulanate 12.5mg/kg BID x 14 days; Chlorhexidine shampoo 2x/week",
    instructions: "Bathe with medicated shampoo twice weekly; apply topical as directed; recheck in 14 days.",
  },
  {
    id: 4,
    label: "Otitis Externa",
    procedures: "Ear cytology, Culture if resistant",
    medications: "Otomax ear drops 6 drops per ear BID x 7 days; clean ears with Epi-Otic",
    instructions: "Clean ears before applying drops; recheck in 7-10 days; prevent swimming during treatment.",
  },
  {
    id: 5,
    label: "Vaccination Visit",
    procedures: "Physical exam, weight check",
    medications: "Per vaccination protocol",
    instructions: "Observe for 20 mins post-vaccination; watch for allergic reaction; next booster as per schedule.",
  },
  {
    id: 6,
    label: "Post-Surgery Recovery",
    procedures: "E-collar fitting, Wound check",
    medications: "Amoxicillin 20mg/kg BID x 7 days; Meloxicam 0.1mg/kg SID x 3 days",
    instructions: "Keep incision dry; restrict activity for 10-14 days; return for suture removal in 10 days; monitor for swelling or discharge.",
  },
];
