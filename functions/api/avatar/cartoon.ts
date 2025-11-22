// ===================================================
// /functions/api/avatar/cartoon.ts
// IA caricature + cache KV + styles + CORS + quota
// Cloudflare Pages Functions + Workers AI (SDXL init_image)
// Compatible Workers AI 2025
// ===================================================

type StyleId = "realistic" | "comic" | "flat" | "exaggerated";

// --------- Limite quotidienne ---------
const DAILY_QUOTA_LIMIT = 100;

// --------- Styles IA ---------
const STYLE_PRESETS: Record<StyleId, { prompt: string; strength: number }> = {
  realistic: {
    prompt: `
High quality caricature portrait, realistic cartoon, soft colors,
thick outlines, expressive facial details. Dark background.
    `,
    strength: 0.55,
  },
  comic: {
    prompt: `
Comic book caricature portrait, bold lines, halftone shading,
vibrant colors, expressive. Dark plain background.
    `,
    strength: 0.6,
  },
  flat: {
    prompt: `
Esport mascot flat vector caricature portrait. Minimalistic, smooth shapes,
clean shadows. Plain background.
    `,
    strength: 0.65,
  },
  exaggerated: {
    prompt: `
Highly exaggerated caricature portrait, oversized features, humorous,
cartoonish, expressive. Dark background.
    `,
    strength: 0.7,
  },
};

// --------- Modèle IA ---------
// ⚠️ Celui-ci est DISPONIBLE dans tous les comptes Cloudflare AI
// et supporte 'init_image' (img2img)
const MODEL_ID = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

// --------- CORS ---------
const PAGES_ORIGIN = "https://darts-counter-v5-3.pages.dev";

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  if (origin === PAGES_ORIGIN) return true;
  if (origin.endsWith(".webcontainer.io")) return true;
  return false;
}

function cors(origin: string | null): HeadersInit {
  if (!origin || !isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

// --------- Utilitaires ---------
async function sha256Hex(buf: ArrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// ===================================================
// HANDLER
// ===================================================
export const onRequest = async (context: any): Promise<Response> => {
  const { request, env } = context;
  const origin = request.headers.get("Origin");
  const corsHeaders = cors(origin);

  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders });

  if (!isAllowedOrigin(origin))
    return new Response("CORS blocked", { status: 403, headers: corsHeaders });

  try {
    if (request.method !== "POST")
      return new Response(JSON.stringify({ error: "POST only" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (!env.AI)
      return new Response(
        JSON.stringify({ error: "AI binding missing in env" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    const form = await request.formData();
    const file = form.get("image") as File | null;
    let style = (form.get("style") as string) || "realistic";

    if (!file)
      return new Response(JSON.stringify({ error: "No image" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (!["realistic", "comic", "flat", "exaggerated"].includes(style))
      style = "realistic";

    const preset = STYLE_PRESETS[style as StyleId];
    const bytes = await file.arrayBuffer();

    // ===================================================
    // CACHE + QUOTA
    // ===================================================
    let cacheKey = "";
    let quotaKey = "";
    let currentQuota = 0;

    if (env.AVATAR_CACHE) {
      const hash = await sha256Hex(bytes);
      cacheKey = `avatar:${style}:${hash}`;

      const cached = await env.AVATAR_CACHE.get(cacheKey);
      if (cached) {
        return new Response(
          JSON.stringify({
            ok: true,
            cartoonPng: cached,
            cached: true,
            quotaUsed: false,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const today = new Date().toISOString().slice(0, 10);
      quotaKey = `quota:${today}`;

      const raw = await env.AVATAR_CACHE.get(quotaKey);
      currentQuota = raw ? parseInt(raw) : 0;

      if (currentQuota >= DAILY_QUOTA_LIMIT) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "daily_quota_reached",
            message: "Quota quotidien atteint.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ===================================================
    // IA : SDXL img2img
    // ===================================================
    let aiResult: any;
    try {
      aiResult = await env.AI.run(MODEL_ID, {
        prompt: preset.prompt,
        init_image: [...new Uint8Array(bytes)], // <-- img2img
        strength: preset.strength, // 0.0 = photo forte, 1.0 = très stylisé
        output_format: "png",
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({ ok: false, error: "ai_run_failed", message: String(err) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===================================================
    // Décodage résultat
    // ===================================================
    let base64: string | null = null;

    if (aiResult instanceof ArrayBuffer) {
      base64 = bytesToBase64(new Uint8Array(aiResult));
    } else if (aiResult?.image instanceof ArrayBuffer) {
      base64 = bytesToBase64(new Uint8Array(aiResult.image));
    } else if (typeof aiResult === "string") {
      base64 = aiResult;
    } else if (aiResult?.image_base64) {
      base64 = aiResult.image_base64;
    }

    if (!base64) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "empty_result",
          message: "No image returned by Cloudflare AI.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const png = base64.startsWith("data:")
      ? base64
      : `data:image/png;base64,${base64}`;

    // ===================================================
    // CACHE + QUOTA UPDATE
    // ===================================================
    if (env.AVATAR_CACHE) {
      await env.AVATAR_CACHE.put(cacheKey, png, {
        expirationTtl: 60 * 60 * 24 * 30,
      });

      const newQuota = currentQuota + 1;
      await env.AVATAR_CACHE.put(quotaKey, String(newQuota), {
        expirationTtl: 60 * 60 * 48,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        cartoonPng: png,
        cached: false,
        quotaUsed: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "unexpected_error",
        message: String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};
