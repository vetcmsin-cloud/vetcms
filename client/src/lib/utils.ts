import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parse } from "date-fns";

export function formatTime12h(timeStr: string | null | undefined): string {
    if (!timeStr) return "";
    try {
        const d = parse(timeStr, "HH:mm", new Date());
        return format(d, "h:mm a");
    } catch {
        return timeStr;
    }
}

export function formatLocalTimestamp(timestamp: string | Date | null | undefined): string {
    if (!timestamp) return "";
    let dateObj: Date;
    if (typeof timestamp === "string") {
        // Always treat stored timestamps as UTC.
        // The server stores UTC without 'Z' suffix, so we append 'Z' to make
        // the browser parse it correctly as UTC before converting to local IST.
        const normalized = timestamp.endsWith("Z") || timestamp.includes("+") ? timestamp : timestamp + "Z";
        dateObj = new Date(normalized);
    } else {
        dateObj = timestamp;
    }

    if (isNaN(dateObj.getTime())) return "";

    // Display in IST (Asia/Kolkata = UTC+5:30)
    return dateObj.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).replace(",", ""); // "01/08/2026 06:02 AM"
}


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWhatsAppLink(phone: string, message: string = "", countryCode: string = "91") {
  if (!phone) return "#";
  let cleanPhone = String(phone).replace(/\D/g, "");
  if (!cleanPhone) return "#";

  // Strip leading zeros if any
  cleanPhone = cleanPhone.replace(/^0+/, "");

  // Default country code if 10-digit number
  const prefix = (countryCode || "91").replace(/\D/g, "") || "91";
  const finalPhone = cleanPhone.length === 10 ? `${prefix}${cleanPhone}` : cleanPhone;

  const isMobile = typeof navigator !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    return `https://wa.me/${finalPhone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  } else {
    return `https://web.whatsapp.com/send?phone=${finalPhone}${message ? `&text=${encodeURIComponent(message)}` : ""}`;
  }
}

export function openWhatsAppLink(phone: string, message: string = "", countryCode: string = "91") {
  const url = formatWhatsAppLink(phone, message, countryCode);
  if (url === "#") return;

  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
