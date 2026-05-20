import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export function formatDate(value: string, pattern = "dd/MM/yyyy") {
  return format(new Date(value), pattern, { locale: vi });
}

export function formatDateTime(value: string) {
  return format(new Date(value), "HH:mm dd/MM/yyyy", { locale: vi });
}

export function fromNow(value: string) {
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: vi });
}
