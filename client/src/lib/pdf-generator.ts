import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Generates a Base64-encoded PDF from a DOM element.
 * 
 * @param elementId The ID of the DOM element to convert to PDF.
 * @returns A promise that resolves to the Base64 data URI of the generated PDF.
 */
export async function generatePDFFromElement(elementId: string): Promise<string> {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Element with id ${elementId} not found.`);
    }

    // Capture the element using html2canvas
    const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.9);

    // A4 dimensions: 210 x 297 mm
    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

    // Output as Data URI string (e.g., data:application/pdf;base64,JVBERi0x...)
    return pdf.output("datauristring");
}
