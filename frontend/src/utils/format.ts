export function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
