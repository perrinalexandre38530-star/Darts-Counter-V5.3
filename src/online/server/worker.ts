// =======================================================
// src/online/server/worker.ts
// Entrée Cloudflare Worker pour l'ONLINE temps réel
// - Route /room/:code → WebSocket vers le RoomDO
// - CORS basique (ALLOW_ORIGINS)
// =======================================================

import type { Env } from "./RoomDO";
import { RoomDO } from "./RoomDO";

export { RoomDO }; // 🔑 important pour que Wrangler trouve la classe DO

function getAllowedOrigins(env: Env): string[] {
  const raw = env.ALLOW_ORIGINS || "";
  return raw
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

function jsonResponse(body: any, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json;charset=utf-8",
      ...(init?.headers || {}),
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    // CORS préflight
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

    // Route WS: /room/:code
    if (url.pathname.startsWith("/room/")) {
      const code = url.pathname.split("/").pop() || "";
      if (!code) {
        return jsonResponse({ error: "Missing room code" }, { status: 400 });
      }

      const upgrade = request.headers.get("Upgrade") || request.headers.get("upgrade");
      if (upgrade !== "websocket") {
        return jsonResponse({ error: "Expected WebSocket upgrade" }, { status: 400 });
      }

      // Chaque code (= lobbyCode) a son DO dédié
      const id = env.ROOMS.idFromName(code.toUpperCase());
      const stub = env.ROOMS.get(id);

      // On forward la requête au DO
      return stub.fetch(request);
    }

    // Healthcheck simple
    if (url.pathname === "/" || url.pathname === "/health") {
      return jsonResponse({ ok: true, message: "darts-online worker up" });
    }

    return jsonResponse({ error: "Not found" }, { status: 404 });
  },
};
