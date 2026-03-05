
import type { Pet, Owner, Appointment, MedicalRecord } from "@shared/schema";

interface PatientReportData {
    pet: Pet;
    owner: Owner;
    records: MedicalRecord[];
    type: "full" | "today" | "specific";
    date?: string; // YYYY-MM-DD
    clinicName?: string;
    clinicAddress?: string;
    clinicPhone?: string;
}

export function generatePatientReport({
    pet,
    owner,
    records,
    type,
    date,
    clinicName = "PetPoint",
    clinicAddress,
    clinicPhone
}: PatientReportData) {
    const today = new Date().toISOString().split('T')[0];
    const targetDate = type === "today" ? today : (type === "specific" && date ? date : null);

    // Filter by date if type is "today" or "specific"
    const filteredRecords = targetDate
        ? records.filter(r => r.date === targetDate)
        : records;

    // Sort by date descending
    const sortedRecords = [...filteredRecords].sort((a, b) => b.date.localeCompare(a.date));

    // Combine distinct dates
    const dates = Array.from(new Set([
        ...sortedRecords.map(r => r.date),
    ])).sort((a, b) => b.localeCompare(a));

    const reportTitle = type === "full"
        ? "Patient Medical Report"
        : `Patient Medical Report - ${targetDate ? new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ""}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Patient Report - ${pet.name}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            body {
                font-family: 'Inter', sans-serif;
                color: #333;
                line-height: 1.5;
                margin: 0;
                padding: 40px;
                background: white;
            }

            @media print {
                body {
                    padding: 0;
                }
                .no-print {
                    display: none;
                }
            }

            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #eee;
                padding-bottom: 20px;
            }

            .header h1 {
                margin: 0;
                color: #2563eb;
                font-size: 24px;
            }

            .header p {
                margin: 5px 0 0;
                color: #666;
                font-size: 14px;
            }

            .patient-summary {
                display: flex;
                gap: 30px;
                margin-bottom: 40px;
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            }

            .patient-photo {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                object-fit: cover;
                background: #e2e8f0;
                flex-shrink: 0;
            }

            .info-column {
                flex: 1;
            }

            .info-group {
                margin-bottom: 15px;
            }

            .info-label {
                font-size: 12px;
                text-transform: uppercase;
                color: #64748b;
                letter-spacing: 0.05em;
                font-weight: 600;
                margin-bottom: 4px;
            }

            .info-value {
                font-size: 16px;
                font-weight: 500;
                color: #1e293b;
            }

            .section-title {
                font-size: 18px;
                font-weight: 600;
                color: #1e293b;
                margin-bottom: 20px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .date-group {
                margin-bottom: 30px;
            }

            .date-header {
                font-size: 14px;
                font-weight: 600;
                color: #64748b;
                background: #f1f5f9;
                padding: 8px 12px;
                border-radius: 6px;
                margin-bottom: 15px;
                display: inline-block;
            }

            .record-card {
                border-left: 3px solid #3b82f6;
                padding-left: 15px;
                margin-bottom: 20px;
            }

            .record-type {
                font-size: 12px;
                font-weight: 600;
                color: #3b82f6;
                text-transform: uppercase;
                margin-bottom: 5px;
            }

            .record-content {
                font-size: 14px;
            }
            
            .record-content p {
                margin: 5px 0;
            }

            .record-meta {
                font-size: 12px;
                color: #94a3b8;
                margin-top: 5px;
            }

            .appointment-card {
                border-left: 3px solid #10b981;
                padding-left: 15px;
                margin-bottom: 15px;
            }

            .appointment-type {
                font-size: 12px;
                font-weight: 600;
                color: #10b981;
                text-transform: uppercase;
                margin-bottom: 5px;
            }

        </style>
    </head>
    <body onload="window.print()">
        <div class="header">
            <h1>${clinicName}</h1>
            ${clinicAddress ? `<p>${clinicAddress}</p>` : ''}
            ${clinicPhone ? `<p>Phone: ${clinicPhone}</p>` : ''}
        </div>

        <div class="section-title">
            <span>Patient Summary</span>
            <span style="font-size: 12px; font-weight: normal; color: #64748b;">Generated on ${today}</span>
        </div>

        <div class="patient-summary">
            ${pet.imageUrl ? `<img src="${pet.imageUrl}" class="patient-photo" alt="${pet.name}" />` : ''}
            
            <div class="info-column">
                <div class="info-group">
                    <div class="info-label">Patient Name</div>
                    <div class="info-value">${pet.name}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Info</div>
                    <div class="info-value">${pet.species} &bull; ${pet.breed} &bull; ${pet.gender}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Age / Weight</div>
                    <div class="info-value">${[pet.age > 0 ? `${pet.age} year${pet.age !== 1 ? 's' : ''}` : "", (pet.ageMonths ?? 0) > 0 ? `${pet.ageMonths} month${pet.ageMonths !== 1 ? 's' : ''}` : ""].filter(Boolean).join(" ") || "< 1 month"} ${pet.weight ? `&bull; ${pet.weight}kg` : ''}</div>
                </div>
            </div>

            <div class="info-column">
                <div class="info-group">
                    <div class="info-label">Owner Name</div>
                    <div class="info-value">${owner.firstName} ${owner.lastName}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Contact</div>
                    <div class="info-value">${owner.phone}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Email</div>
                    <div class="info-value">${owner.email}</div>
                </div>
            </div>
        </div>

        <div class="section-title">
            <span>${reportTitle}</span>
        </div>

        ${dates.length === 0 ? '<p style="text-align: center; color: #94a3b8; font-style: italic;">No records found for this period.</p>' : ''}

        ${dates.map(date => {
        const dateRecords = sortedRecords.filter(r => r.date === date);

        return `
                <div class="date-group">
                    <div class="date-header">${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    
                    ${dateRecords.map(rec => `
                        <div class="record-card">
                            <div class="record-type">Medical Record</div>
                            <div class="record-content">
                                <p><strong>Diagnosis:</strong> ${rec.diagnosis}</p>
                                <p><strong>Treatment:</strong> ${rec.treatment}</p>
                                ${rec.prescription ? `<p><strong>Prescription:</strong> ${rec.prescription}</p>` : ''}
                                ${rec.notes ? `<div style="margin-top: 10px; font-size: 13px; color: #475569; white-space: pre-wrap; background: #f8fafc; padding: 10px; border-radius: 4px;">${rec.notes}</div>` : ''}
                            </div>
                            <div class="record-meta">Veterinarian: Dr. ${rec.veterinarian}</div>
                        </div>
                    `).join('')}
                </div>
            `;
    }).join('')}
        
        <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8;">
            Generated by PetPoint Pro Veterinary Clinic Management System
        </div>
    </body>
    </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    }
}
