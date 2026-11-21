/**
 * Shared timezone utilities used across the app.
 * Reads the `clinicTimezone` setting from clinic settings.
 * Falls back to "Asia/Kolkata" (IST) by default.
 */

export const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata",      label: "IST — India Standard Time (UTC+5:30)" },
  { value: "Asia/Dubai",        label: "GST — Gulf Standard Time (UTC+4)" },
  { value: "Asia/Colombo",      label: "SLST — Sri Lanka Standard Time (UTC+5:30)" },
  { value: "Asia/Dhaka",        label: "BST — Bangladesh Standard Time (UTC+6)" },
  { value: "Asia/Kathmandu",    label: "NPT — Nepal Time (UTC+5:45)" },
  { value: "Asia/Singapore",    label: "SGT — Singapore Time (UTC+8)" },
  { value: "Asia/Tokyo",        label: "JST — Japan Standard Time (UTC+9)" },
  { value: "Europe/London",     label: "GMT/BST — United Kingdom" },
  { value: "Europe/Berlin",     label: "CET/CEST — Central European Time" },
  { value: "America/New_York",  label: "EST/EDT — US Eastern Time" },
  { value: "America/Chicago",   label: "CST/CDT — US Central Time" },
  { value: "America/Los_Angeles", label: "PST/PDT — US Pacific Time" },
  { value: "UTC",               label: "UTC — Coordinated Universal Time" },
];

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Format a date string or Date object in the given IANA timezone.
 * @param raw - ISO string, YYYY-MM-DD string, or Date
 * @param timezone - IANA timezone name (e.g. "Asia/Kolkata")
 * @param includeTime - if true, appends HH:mm to the output
 */
export function formatInTZ(
  raw: string | Date | null | undefined,
  timezone: string = DEFAULT_TIMEZONE,
  includeTime = false
): string {
  if (!raw) return "";

  // Fast path: plain YYYY-MM-DD strings (from HTML date inputs) — no timezone conversion needed
  if (typeof raw === "string") {
    const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
    }
  }

  try {
    const date = typeof raw === "string" ? new Date(raw) : raw;
    if (isNaN(date.getTime())) return String(raw);

    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...(includeTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {}),
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

    if (includeTime) {
      return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")} ${get("dayPeriod") ?? ""}`.trim();
    }
    return `${get("day")}/${get("month")}/${get("year")}`;
  } catch {
    return String(raw);
  }
}

/**
 * Get the stored clinic timezone from the API settings object.
 * Safely falls back to IST.
 */
export function getClinicTimezone(settings?: Record<string, string> | null): string {
  return settings?.clinicTimezone || DEFAULT_TIMEZONE;
}
