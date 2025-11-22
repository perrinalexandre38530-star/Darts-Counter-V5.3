// ===================================================
// /functions/api/avatar/cartoon.ts
// IA caricature + quota + cache KV + CORS
// Modèle Cloudflare : stable-diffusion-xl-base-1.0
// ===================================================

type StyleId = "realistic" | "comic" | "flat" | "exaggerated";

// --------- QUOTA JOURNALIER ---------
const DAILY_QUOTA_LIMIT = 100;

// --------- STYLE PRESETS ---------
const STYLE_PRESETS: Record<StyleId, { prompt: string; negative: string }> = {
  realistic: {
    prompt: "high quality digital caricature portrait, realistic cartoon, warm colors, clean outlines, expressive face, no frame, no text",
    negative: "blurry, distorted, watermark, text, logo"
  },
  comic: {
    prompt: "comic book caricature style, bold outlines, halftone shading, vibrant colors, expressive face, no text",
    negative: "realistic photo, watermark, text"
  },
  flat: {
    prompt: "flat vector esport-mascot style, smooth shading, bold shapes, face centered, no text no frame",
    negative: "photorealistic, noisy, messy"
  },
  exaggerated: {
    prompt: "highly exaggerated caricature, big facial features, humorous but recognizable, clean background",
    negative: "ugly, smeared, distorted, watermark"
  }
};

// --------- MODELE IA ---------
const MODEL_ID = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

// --------- ORIGINE CORS ---------
const PAGES_ORIGIN = "https://darts-counter-v5-3.pages.dev";

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (origin === PAGES_ORIGIN) return true;
  if (origin.endsWith(".webcontainer.io")) return true;
  return false;
}

function makeCorsHeaders(origin: string | null): HeadersInit {
  if (!origin || !isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

// --------- UTILS ---------
async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// ===================================================
export const onRequest = async (context: any): Promise<Response> => {
  const { request, env } = context;
  const origin = request.headers.get("Origin");
  const corsHeaders = makeCorsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!isAllowedOrigin(origin)) {
    return new Response("CORS blocked", { status: 403, headers: corsHeaders });
  }

  try {
    if (request.method !== "POST") {
      return new Response("Only POST allowed", {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!env.AI) {
      return new Response(JSON.stringify({ error: "AI binding missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await request.formData();
    const file = form.get("image") as File | null;
    let style = (form.get("style") as string) || "realistic";

    if (!file) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!STYLE_PRESETS[style]) style = "realistic";
    const preset = STYLE_PRESETS[style as StyleId];

    const bytes = await file.arrayBuffer();

    // ---------- QUOTA & CACHE ----------
    let cacheKey = "";
    let quotaKey = "";
    let currentQuota = 0;

    if (env.AVATAR_CACHE) {
      const hash = await sha256Hex(bytes);
      cacheKey = `avatar:${style}:${hash}`;

      const cached = await env.AVATAR_CACHE.get(cacheKey);
      if (cached) {
        return new Response(JSON.stringify({ ok: true, cartoonPng: cached, cached: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const today = new Date().toISOString().slice(0, 10);
      quotaKey = `quota:${today}`;

      currentQuota = parseInt((await env.AVATAR_CACHE.get(quotaKey)) || "0");

      if (currentQuota >= DAILY_QUOTA_LIMIT) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "daily_quota_reached",
            limit: DAILY_QUOTA_LIMIT,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ---------- APPEL IA ----------
    const aiResult: any = await env.AI.run(MODEL_ID, {
      prompt: preset.prompt,
      negative_prompt: preset.negative,
      image: [...new Uint8Array(bytes)],
      strength: 0.55,
      num_steps: 18,
    });

    let rawBytes: Uint8Array | null = null;

    if (aiResult instanceof ArrayBuffer) rawBytes = new Uint8Array(aiResult);
    else if (aiResult?.image instanceof ArrayBuffer) rawBytes = new Uint8Array(aiResult.image);
    else if (Array.isArray(aiResult)) rawBytes = new Uint8Array(aiResult);

    if (!rawBytes) {
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pngDataUrl = "data:image/png;base64," + bytesToBase64(rawBytes);

    // --------- STOCKAGE + QUOTA ----------
    if (env.AVATAR_CACHE) {
      await env.AVATAR_CACHE.put(cacheKey, pngDataUrl, { expirationTtl: 3600 * 24 * 30 });
      await env.AVATAR_CACHE.put(quotaKey, String(currentQuota + 1), {
        expirationTtl: 3600 * 48,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, cartoonPng: pngDataUrl, cached: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
