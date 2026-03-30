import { readFileSync } from "node:fs";

let envLoaded = false;

if (!envLoaded) {
  const envFile = readFileSync(".env.local", "utf8");
  for (const rawLine of envFile.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  envLoaded = true;
}
