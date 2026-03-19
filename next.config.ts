import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

let majorMinor = "0.1";
try {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version?: string };
  const [major = "0", minor = "0"] = (pkg.version ?? "0.1.0").split(".");
  majorMinor = `${major}.${minor}`;
} catch {
  // fallback
}

// On Vercel: use short SHA (unique per commit, always available)
// Locally: use git commit count
let buildId = "0";
if (process.env.VERCEL_GIT_COMMIT_SHA) {
  buildId = process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
} else {
  try {
    buildId = execSync("git rev-list --count HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    // git not available
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: `${majorMinor}.${buildId}`,
  },
};

export default nextConfig;
