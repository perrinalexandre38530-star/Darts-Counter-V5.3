// =======================================================
// src/online/server/worker.ts
// Entrée Cloudflare Worker pour l'ONLINE temps réel + Sync Cloud + Scanner fléchettes
// - Route /room/:code → WebSocket vers le RoomDO
// - Routes /api/sync/upload & /api/sync/download → KV DC_SYNC
// - Route /dart-scan → scan fléchettes (R2 + IA placeholder)
// - CORS basique (ALLOW_ORIGINS)
// =======================================================

import type { Env } from "./RoomDO";
import { RoomDO } from "./RoomDO";
// ⚠️ Dans RoomDO.ts, Env doit contenir :
// DART_IMAGES_BUCKET: R2Bucket;
// PUBLIC_BASE_URL: string;
// AI: any;

export { RoomDO }; // 🔑 important pour que Wrangler trouve la classe DO

// --------------------------------------------
// Helpers CORS
// --------------------------------------------
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
  if (allowed.length === 0) return true; // si pas configuré → on laisse tout passer
  return allowed.includes(origin);
}

// Réponse JSON "brute" (sans CORS)
function jsonResponse(body: any, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json;charset=utf-8",
      ...(init?.headers || {}),
    },
  });
}

// Réponse JSON d’erreur (sans CORS)
function jsonError(message: string, status: number): Response {
  return jsonResponse({ error: message }, { status });
}

// Ajout des headers CORS sur une réponse existante
function withCors(env: Env, request: Request, res: Response): Response {
  const origin = request.headers.get("Origin");
  const headers = new Headers(res.headers);

  if (origin && isOriginAllowed(env, origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

// --------------------------------------------
// Cloud Sync: upload / download
// --------------------------------------------

// Génère un petit token lisible type "7FQ9-L2KD-8ZP3"
function generateToken(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans O/0/1/I
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  // format 4-4-4 par défaut
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!payload || typeof payload !== "object") {
    return jsonError("Invalid payload", 400);
  }

  if (!payload.store) {
    // On s'attend normalement à { kind, createdAt, app, store }
    return jsonError("Missing 'store' in payload", 400);
  }

  const token = generateToken();
  const key = `sync:${token}`;

  // On stocke le snapshot complet, TTL 7 jours (configurable)
  await env.DC_SYNC.put(key, JSON.stringify(payload), {
    expirationTtl: 60 * 60 * 24 * 7,
  });

  return jsonResponse({ token });
}

async function handleDownload(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = (url.searchParams.get("token") || "").trim();

  if (!token) {
    return jsonError("Missing 'token' query parameter", 400);
  }

  const key = `sync:${token}`;
  const raw = await env.DC_SYNC.get(key);

  if (!raw) {
    return jsonError("Snapshot not found", 404);
  }

  // On renvoie le snapshot tel quel (SyncCenter.tsx lit data.store)
  const snapshot = JSON.parse(raw);
  return jsonResponse(snapshot);
}

// --------------------------------------------
// Scanner fléchettes: /dart-scan
// --------------------------------------------

type DartScanOptions = {
  bgColor?: string;
  targetAngleDeg?: number;
  cartoonLevel?: number;
};

type DartScanResult = {
  mainImageUrl: string;
  thumbImageUrl: string;
  bgColor?: string;
};

async function handleDartScan(request: Request, env: Env): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return jsonError("Missing image file", 400);
    }

    let options: DartScanOptions = {};
    const rawOptions = formData.get("options");
    if (typeof rawOptions === "string") {
      try {
        options = JSON.parse(rawOptions);
      } catch {
        return jsonError("Invalid options JSON", 400);
      }
    }

    const result = await processDartImage(file, options, env);

    return jsonResponse({
      mainImageUrl: result.mainImageUrl,
      thumbImageUrl: result.thumbImageUrl,
      bgColor: result.bgColor,
    });
  } catch (err: any) {
    console.error("[/dart-scan] error", err);
    return jsonError("Internal error while scanning dart", 500);
  }
}

async function processDartImage(
  file: File,
  options: DartScanOptions,
  env: Env
): Promise<DartScanResult> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const bgColor = options.bgColor || "#101020";
  const targetAngleDeg = options.targetAngleDeg ?? 48;
  const cartoonLevel = options.cartoonLevel ?? 0.8;

  // -------------------------------------------------
  // 1) Pipeline IA (placeholder)
  // Pour l’instant, on renvoie l'image brute pour tester
  // upload R2 + URLs. Plus tard : détourage + cartoon + rotation.
  // -------------------------------------------------

  const cartoonPngBytes = bytes;

  // 2) Miniature pour overlay avatar (placeholder aussi)
  const thumbPngBytes = cartoonPngBytes; // TODO: resize si besoin

  // 3) Sauvegarde dans R2

  const mainKey = `dart-sets/main-${crypto.randomUUID()}.png`;
  const thumbKey = `dart-sets/thumb-${crypto.randomUUID()}.png`;

  await env.DART_IMAGES_BUCKET.put(mainKey, cartoonPngBytes, {
    httpMetadata: { contentType: "image/png" },
  });

  await env.DART_IMAGES_BUCKET.put(thumbKey, thumbPngBytes, {
    httpMetadata: { contentType: "image/png" },
  });

  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, "");

  const mainImageUrl = `${base}/${mainKey}`;
  const thumbImageUrl = `${base}/${thumbKey}`;

  return {
    mainImageUrl,
    thumbImageUrl,
    bgColor,
  };
}

// --------------------------------------------
// Worker principal
// --------------------------------------------
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    // ------- CORS préflight -------
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

    // ------- Route scanner fléchettes -------
    if (url.pathname === "/dart-scan" && request.method === "POST") {
      const res = await handleDartScan(request, env);
      return withCors(env, request, res);
    }

    // ------- Routes Cloud Sync -------
    if (url.pathname === "/api/sync/upload" && request.method === "POST") {
      const res = await handleUpload(request, env);
      return withCors(env, request, res);
    }

    if (url.pathname === "/api/sync/download" && request.method === "GET") {
      const res = await handleDownload(request, env);
      return withCors(env, request, res);
    }

    // ------- Route WS: /room/:code -------
    if (url.pathname.startsWith("/room/")) {
      const code = url.pathname.split("/").pop() || "";
      if (!code) {
        const res = jsonError("Missing room code", 400);
        return withCors(env, request, res);
      }

      const upgrade =
        request.headers.get("Upgrade") || request.headers.get("upgrade");
      if (upgrade !== "websocket") {
        const res = jsonError("Expected WebSocket upgrade", 400);
        return withCors(env, request, res);
      }

      // Chaque code (= lobbyCode) a son DO dédié
      const id = env.ROOMS.idFromName(code.toUpperCase());
      const stub = env.ROOMS.get(id);

      // On forward la requête au DO (pas de CORS sur un Upgrade)
      return stub.fetch(request);
    }

    // ------- Healthcheck simple -------
    if (url.pathname === "/" || url.pathname === "/health") {
      const res = jsonResponse({
        ok: true,
        message: "darts-online worker up",
      });
      return withCors(env, request, res);
    }

    // ------- 404 -------
    const res = jsonError("Not found", 404);
    return withCors(env, request, res);
  },
};
