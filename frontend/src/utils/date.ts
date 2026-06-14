import { format, formatDistanceToNow, formatDistance } from "date-fns";
import { vi } from "date-fns/locale";

/**
 * Force the Date object to represent the exact same hours/minutes as it would in Vietnam,
 * regardless of the browser's actual timezone.
 * This tricks date-fns format() into always displaying Vietnam time.
 */
function getVietnamTime(date: Date): Date {
  const vnString = date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  return new Date(vnString);
}

export function formatDate(value: string, pattern = "dd/MM/yyyy") {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    if (pattern === "dd/MM/yyyy") {
      return `${day}/${month}/${year}`;
    }
  }
  const vnDate = getVietnamTime(new Date(value));
  return format(vnDate, pattern, { locale: vi });
}

export function formatDateTime(value: string) {
  const vnDate = getVietnamTime(new Date(value));
  return format(vnDate, "HH:mm dd/MM/yyyy", { locale: vi });
}

export function fromNow(value: string) {
  // fromNow compares with the actual local time, so if we shift the value to VN time
  // we also need to shift the "now" reference to VN time.
  const vnDate = getVietnamTime(new Date(value));
  const vnNow = getVietnamTime(new Date());
  return formatDistance(vnDate, vnNow, { addSuffix: true, locale: vi });
}
