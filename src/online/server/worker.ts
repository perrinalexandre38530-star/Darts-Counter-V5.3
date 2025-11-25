// =======================================================
// src/online/server/worker.ts
// Entrée Cloudflare Worker pour l'ONLINE temps réel (FULL WEB)
// - Route /room/:code → WebSocket → RoomDO
// - CORS propre via ALLOW_ORIGINS
// - Endpoint /health
// =======================================================

import { RoomDO } from "./RoomDO";
import type { Env } from "./RoomDO";

// ⬅️ Export obligatoire pour Wrangler (détecte la classe DO)
export { RoomDO };

// -------------------------------
// Helpers CORS
// -------------------------------
function getAllowedOrigins(env: Env): string[] {
  return (env.ALLOW_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isOriginAllowed(env: Env, origin: string | null): boolean {
  if (!origin) return false;
  const allowed = getAllowedOrigins(env);
  if (allowed.length === 0) return true;
  return allowed.includes(origin);
}

function json(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json;charset=utf-8",
    },
  });
}

// -------------------------------
// WORKER MAIN FETCH
// -------------------------------
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    // -------------------
    // CORS preflight
    // -------------------
    if (request.method === "OPTIONS") {
      const headers: Record<string, string> = {
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      };

      if (origin && isOriginAllowed(env, origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Vary"] = "Origin";
      }

      return new Response(null, { status: 204, headers });
    }

    // -------------------
    // 🟦 Route WebSocket
    //     /room/ABCD
    // -------------------
    if (url.pathname.startsWith("/room/")) {
      const code = url.pathname.split("/").pop() || "";

      if (!code) return json({ error: "Missing room code" }, 400);

      const upgrade =
        request.headers.get("Upgrade") || request.headers.get("upgrade");
      if (upgrade !== "websocket") {
        return json({ error: "Expected WebSocket upgrade" }, 400);
      }

      // Chaque room est un Durable Object basé sur son code
      const id = env.ROOMS.idFromName(code.toUpperCase());
      const stub = env.ROOMS.get(id);

      return stub.fetch(request);
    }

    // -------------------
    // /health
    // -------------------
    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, worker: "darts-online", status: "running" });
    }

    // -------------------
    // 404 fallback
    // -------------------
    return json({ error: "Not found" }, 404);
  },
};
