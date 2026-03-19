import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

let commitCount = "0";
try {
  commitCount = execSync("git rev-list --count HEAD", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {
  // git not available
}

let majorMinor = "0.1";
try {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version?: string };
  const [major = "0", minor = "0"] = (pkg.version ?? "0.1.0").split(".");
  majorMinor = `${major}.${minor}`;
} catch {
  // fallback
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: `${majorMinor}.${commitCount}`,
  },
};

export default nextConfig;
