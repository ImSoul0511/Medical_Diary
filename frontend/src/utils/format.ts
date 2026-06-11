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

export function parseUserAgent(userAgent: string): string {
  if (!userAgent) return "Không rõ thiết bị";
  
  const ua = userAgent.toLowerCase();
  
  // Detect OS/Device
  let os = "";
  if (ua.includes("iphone")) {
    os = "iPhone";
  } else if (ua.includes("ipad")) {
    os = "iPad";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (ua.includes("windows")) {
    os = "Windows";
  } else if (ua.includes("macintosh") || ua.includes("mac os")) {
    os = "macOS";
  } else if (ua.includes("linux")) {
    os = "Linux";
  }
  
  // Detect Browser
  let browser = "";
  if (ua.includes("edg/")) {
    browser = "Edge";
  } else if (ua.includes("chrome") && !ua.includes("chromium")) {
    browser = "Chrome";
  } else if (ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium")) {
    browser = "Safari";
  } else if (ua.includes("firefox")) {
    browser = "Firefox";
  } else if (ua.includes("opera") || ua.includes("opr/")) {
    browser = "Opera";
  } else if (ua.includes("httpx")) {
    browser = "HTTP Client (FastAPI)";
  }
  
  if (os && browser) {
    return `${browser} trên ${os}`;
  } else if (os) {
    return os;
  } else if (browser) {
    return browser;
  }
  
  return userAgent.split(" ")[0] || userAgent;
}
