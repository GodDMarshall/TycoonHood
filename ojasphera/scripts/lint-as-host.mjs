// While this folder lives inside the TycoonHood repository, TycoonHood's own
// `pnpm lint` (`eslint .` at the repo root) also lints these files — with
// TycoonHood's config, ESLint version and plugins, not ours. This runs exactly
// that lint on this folder, so an Ojasphera change can never turn TycoonHood's
// lint red. Outside TycoonHood (e.g. in its own repository) it does nothing.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const host = dirname(here);
const folder = basename(here);

let hostName = null;
try {
  hostName = JSON.parse(readFileSync(join(host, "package.json"), "utf8")).name;
} catch {}

if (hostName !== "tycoonhood" || !existsSync(join(host, "eslint.config.mjs"))) {
  console.log("lint-as-host: not inside the TycoonHood repository — nothing to check.");
  process.exit(0);
}

const eslintBin = join(host, "node_modules", "eslint", "bin", "eslint.js");
if (!existsSync(eslintBin)) {
  console.warn(
    "lint-as-host: TycoonHood's dependencies aren't installed, so its lint can't be run on this folder.\n" +
      "              Run `pnpm install` at the repository root to enable this check.",
  );
  process.exit(0);
}

console.log(`lint-as-host: running TycoonHood's lint on ${folder}/ …`);
const result = spawnSync(process.execPath, [eslintBin, folder], { cwd: host, stdio: "inherit" });
if (result.status !== 0) {
  console.error(`lint-as-host: TycoonHood's lint fails on ${folder}/ — fix these before committing.`);
}
process.exit(result.status ?? 1);
