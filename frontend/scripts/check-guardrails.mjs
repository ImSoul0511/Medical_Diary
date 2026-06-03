import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(scriptDir, "../src");

const allowedAxiosClient = "api/apiClient.ts";
const allowedApiBaseUrlFiles = new Set(["api/apiClient.ts", "vite-env.d.ts"]);
const allowedWithCredentialsFiles = new Set(["api/authApi.ts"]);

const bannedTokens = [
  "fetch(",
  "XMLHttpRequest",
  "@supabase/supabase-js",
  "supabaseClient",
  "localStorage",
  "sessionStorage",
];

const bannedPatterns = [
  { label: "service_role", pattern: /service[_-]?role/i },
  { label: "secret key", pattern: /\b(secret|secret_key|SUPABASE_SERVICE_ROLE_KEY)\b/ },
];

function files(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    return stat.isDirectory() ? files(path) : [path];
  });
}

function relPath(file) {
  return relative(srcRoot, file).replace(/\\/g, "/");
}

const offenders = [];
let axiosCreateCount = 0;

for (const file of files(srcRoot)) {
  if (!/\.(ts|tsx|css)$/.test(file)) continue;

  const rel = relPath(file);
  const source = readFileSync(file, "utf8");

  for (const token of bannedTokens) {
    if (source.includes(token)) offenders.push(`${rel}: banned token ${token}`);
  }

  for (const { label, pattern } of bannedPatterns) {
    if (pattern.test(source)) offenders.push(`${rel}: banned ${label}`);
  }

  if (source.includes("axios") && rel !== allowedAxiosClient) {
    offenders.push(`${rel}: axios is only allowed in ${allowedAxiosClient}`);
  }

  const axiosCreateMatches = source.match(/axios\.create\s*\(/g) ?? [];
  axiosCreateCount += axiosCreateMatches.length;
  if (axiosCreateMatches.length > 0 && rel !== allowedAxiosClient) {
    offenders.push(`${rel}: axios.create is only allowed in ${allowedAxiosClient}`);
  }

  if (source.includes("VITE_API_BASE_URL") && !allowedApiBaseUrlFiles.has(rel)) {
    offenders.push(`${rel}: VITE_API_BASE_URL is only allowed in the central API client`);
  }

  if (source.includes("withCredentials") && !allowedWithCredentialsFiles.has(rel)) {
    offenders.push(`${rel}: withCredentials is only allowed in auth API calls`);
  }
}

if (axiosCreateCount > 1) {
  offenders.push(`src: expected at most one axios.create call, found ${axiosCreateCount}`);
}

if (offenders.length > 0) {
  console.error("Guardrail violations found:");
  console.error(offenders.join("\n"));
  process.exit(1);
}

console.log("Guardrails passed: Axios is centralized and forbidden browser API/storage/Supabase wiring was not found.");
