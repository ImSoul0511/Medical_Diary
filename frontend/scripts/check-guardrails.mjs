import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, "../src");
const forbidden = [
  "fetch(",
  "axios",
  "XMLHttpRequest",
  "@supabase/supabase-js",
  "VITE_API_BASE_URL",
  "supabaseClient",
];

function files(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    return stat.isDirectory() ? files(path) : [path];
  });
}

const offenders = [];
for (const file of files(root)) {
  if (!/\.(ts|tsx|css)$/.test(file)) continue;
  const source = readFileSync(file, "utf8");
  for (const token of forbidden) {
    if (source.includes(token)) offenders.push(`${file}: ${token}`);
  }
}

if (offenders.length > 0) {
  console.error("Guardrail violations found:");
  console.error(offenders.join("\n"));
  process.exit(1);
}

console.log("Guardrails passed: no API/Supabase runtime wiring found.");
