import fs from "node:fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/*
 * Public Supabase build-time values bridge (no new dependency).
 *
 * The two PUBLIC values (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
 * are versioned as `vars` in wrangler.jsonc. Wrangler vars are runtime Worker
 * config and are NOT available to the Vite build, so this bridge feeds them
 * into the build environment explicitly. Precedence (highest first), so
 * Cloudflare Workers Builds "Build variables" and ignored local .env files
 * override the versioned JSON defaults:
 *   1. existing process.env (Cloudflare build variables / shell exports)
 *   2. Vite .env files via loadEnv (e.g. a git-ignored .env.local)
 *   3. wrangler.jsonc `vars` defaults (public values only)
 * Only publishable values ever take this path; no secret belongs here, and a
 * missing or unreadable value never breaks the build (the page then reports
 * "Not configured" honestly at runtime).
 */

const PUBLIC_ENV_KEYS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;

function readWranglerVars(): Record<string, string> {
  try {
    const raw = fs.readFileSync(new URL("./wrangler.jsonc", import.meta.url), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.vars === "object" && parsed.vars !== null) {
      return parsed.vars;
    }
    return {};
  } catch (error) {
    console.warn(
      "[vite.config] Could not read vars from wrangler.jsonc; " +
        "public env defaults are not applied. " +
        `(${error instanceof Error ? error.message : String(error)})`,
    );
    return {};
  }
}

function applyPublicEnvDefaults(mode: string): void {
  const fileEnv = loadEnv(mode, process.cwd(), "VITE_");
  const wranglerVars = readWranglerVars();
  for (const key of PUBLIC_ENV_KEYS) {
    if (process.env[key] !== undefined) continue;
    const value = fileEnv[key] ?? wranglerVars[key];
    if (value !== undefined && value !== "") {
      process.env[key] = value;
    }
  }
}

export default defineConfig(({ mode }) => {
  applyPublicEnvDefaults(mode);
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});
