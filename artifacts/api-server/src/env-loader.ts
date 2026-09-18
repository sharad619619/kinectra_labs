import fs from "fs";
import path from "path";

// Programmatically load .env file variables in local environments
try {
  let envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    envPath = path.resolve(process.cwd(), "..", ".env");
  }
  if (!fs.existsSync(envPath)) {
    envPath = path.resolve(process.cwd(), "..", "..", ".env");
  }
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const lines = envContent.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const index = trimmed.indexOf("=");
        if (index !== -1) {
          const key = trimmed.substring(0, index).trim();
          const value = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, "");
          if (key) {
            process.env[key] = value;
          }
        }
      }
    }
  }
} catch (envError) {
  console.warn("Failed to load .env file programmatically:", envError);
}
