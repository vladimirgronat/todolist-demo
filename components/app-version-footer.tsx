import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";

const getVersionLabel = cache(async () => {
  let majorMinor = "0.0";

  try {
    const packageJsonPath = join(process.cwd(), "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      version?: string;
    };
    const [major = "0", minor = "0"] = (packageJson.version ?? "0.0.0").split(".");
    majorMinor = `${major}.${minor}`;
  } catch {
    // Fallback keeps footer render-safe even if package.json cannot be read.
  }

  let commitCount = "0";

  try {
    commitCount = execSync("git rev-list --count HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    // Fallback when git metadata is unavailable in runtime/build environment.
  }

  return `${majorMinor}.${commitCount}`;
});

export const AppVersionFooter = async () => {
  const versionLabel = await getVersionLabel();

  return (
    <footer className="mx-auto w-full max-w-2xl px-4 pb-6 pt-3 text-center text-xs text-gray-500">
      Version {versionLabel}
    </footer>
  );
};
