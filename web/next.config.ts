import type { NextConfig } from "next";
import * as fs from "fs";
import * as path from "path";

/* ──────────────────────────────────────────────────────────────────────────
 * โหลด root .env เป็น single source of truth
 * (Next.js อ่านเฉพาะ web/.env* อัตโนมัติ ต้องโหลด parent .env เอง)
 * ────────────────────────────────────────────────────────────────────────── */
function loadRootEnv() {
  const envPath = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    // ไม่ override ถ้า process.env มีอยู่แล้ว (shell env > .env file)
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadRootEnv();

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3002";

const nextConfig: NextConfig = {
  /* ── expose NEXT_PUBLIC_* จาก root .env ไปยัง client bundle ── */
  env: {
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL ?? BACKEND_URL,
  },

  /* ── server-side proxy rewrites ── */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
