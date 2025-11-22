// ===================================================
// /functions/api/avatar/cartoon.ts
// IA caricature + cache KV + multi-styles + CORS + QUOTA
// Cloudflare Pages Functions — modèle @cf/lykon/dreamshaper-8-lcm
// ===================================================

type StyleId = "realistic" | "comic" | "flat" | "exaggerated";

// --------- Limite quotidienne ---------
const DAILY_QUOTA_LIMIT = 100;

// --------- Styles IA (prompts + strength interne) ---------
const STYLE_PRESETS: Record<StyleId, { prompt: string }> = {
  realistic: {
    prompt: `
      Hand-drawn caricature portrait of the same person.
      Style: realistic cartoon, warm colors, thick outlines, visible brush strokes.
      Emphasize expression and humor without distorting identity.
      High quality. Plain dark background. No frame. No text.
    `,
  },
  comic: {
    prompt: `
      Comic-book style caricature portrait of the same person.
      Bold outlines, halftone shadows, vibrant colors.
      Recognizable face. Plain dark background, no text, no frame.
    `,
  },
  flat: {
    prompt: `
      Vector flat caricature portrait of the same person.
      Esport mascot style logo, minimal shading, smooth shapes.
      Plain background, no text, no frame.
    `,
  },
  exaggerated: {
    prompt: `
      Highly exaggerated caricature portrait of the same person.
      Oversized facial features, humorous, expressive, but recognizable.
      Plain background, no text, no frame.
    `,
  },
};

// --------- Modèle IA (image-to-image Dreamshaper) ---------
const MODEL_ID = "@cf/lykon/dreamshaper-8-lcm";

// --------- CORS ORIGINS AUTORISÉS ---------
const PAGES_ORIGIN = "https://darts-counter-v5-3.pages.dev";

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (origin === PAGES_ORIGIN) return true;
  // Dev depuis Stackblitz : sous-domaines *.webcontainer.io
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

// --------- Utilitaires ---------
async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// -------------- PAGES FUNCTION --------------
export const onRequest = async (context: any): Promise<Response> => {
  const { request, env } = context;
  const origin = request.headers.get("Origin");
  const corsHeaders = makeCorsHeaders(origin);

  // Préflight CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // CORS strict
  if (!isAllowedOrigin(origin)) {
    return new Response("CORS blocked", {
      status: 403,
      headers: corsHeaders,
    });
  }

  try {
    if (request.method !== "POST") {
      return new Response("Only POST allowed", {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (!env.AI || typeof env.AI.run !== "function") {
      return new Response(
        JSON.stringify({ error: "Workers AI binding 'AI' not configured." }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const form = await request.formData();
    const file = form.get("image") as File | null;
    let style = (form.get("style") as string) || "realistic";

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!["realistic", "comic", "flat", "exaggerated"].includes(style)) {
      style = "realistic";
    }
    const styleId = style as StyleId;
    const preset = STYLE_PRESETS[styleId];

    const bytes = await file.arrayBuffer();

    // ---------------- CACHE + QUOTA (KV) ----------------
    let cacheKey = "";
    let quotaKey = "";
    let currentQuota = 0;

    if (env.AVATAR_CACHE) {
      // 1) Cache par hash de l'image + style
      const hash = await sha256Hex(bytes);
      cacheKey = `avatar:${styleId}:${hash}`;

      const cached = await env.AVATAR_CACHE.get(cacheKey);
      if (cached) {
        // ✅ Résultat déjà généré → pas de quota consommé
        return new Response(
          JSON.stringify({ ok: true, cartoonPng: cached, cached: true }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // 2) Quota journalier
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD en UTC
      quotaKey = `quota:${today}`;

      const rawQuota = await env.AVATAR_CACHE.get(quotaKey);
      currentQuota = rawQuota ? parseInt(rawQuota, 10) || 0 : 0;

      if (currentQuota >= DAILY_QUOTA_LIMIT) {
        // ❌ Quota dépassé → on NE fait PAS d'appel IA (donc pas de coût)
        return new Response(
          JSON.stringify({
            ok: false,
            error: "daily_quota_reached",
            message:
              "Le quota quotidien d’avatars a été atteint. Réessaie demain.",
            limit: DAILY_QUOTA_LIMIT,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
      // Sinon, on laisse passer et on incrémentera après génération IA
    }

    // ---------------- IA CLOUDFLARE (Dreamshaper img2img) ----------------
    const uint8 = new Uint8Array(bytes);

    const aiInput: any = {
      prompt: preset.prompt,
      negative_prompt:
        "text, watermark, logo, border, frame, extra limbs, deformed, blurry, low quality",
      image: [...uint8], // tableau d'entiers, comme demandé dans la doc
      // hauteur/largeur typiques (multiples de 64)
      height: 768,
      width: 768,
    };

    let aiResult: any;
    try {
      aiResult = await env.AI.run(MODEL_ID, aiInput);
    } catch (err: any) {
      // On renvoie l’erreur brute pour voir EXACTEMENT ce que dit le modèle
      return new Response(
        JSON.stringify({
          step: "ai_run",
          error: err?.message ?? String(err),
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // aiResult peut être :
    // - un ArrayBuffer
    // - un objet { image: ArrayBuffer | number[] | string }
    // - un simple tableau de nombres
    let rawBytes: Uint8Array | null = null;

    if (aiResult instanceof ArrayBuffer) {
      rawBytes = new Uint8Array(aiResult);
    } else if (aiResult && aiResult.image instanceof ArrayBuffer) {
      rawBytes = new Uint8Array(aiResult.image);
    } else if (aiResult && Array.isArray(aiResult.image)) {
      rawBytes = new Uint8Array(aiResult.image);
    } else if (Array.isArray(aiResult)) {
      rawBytes = new Uint8Array(aiResult);
    } else if (aiResult && typeof aiResult.image === "string") {
      // Certains modèles renvoient directement du base64
      const pngDataUrl = `data:image/png;base64,${aiResult.image}`;
      // On met quand même en cache + quota si possible
      if (env.AVATAR_CACHE && cacheKey) {
        await env.AVATAR_CACHE.put(cacheKey, pngDataUrl, {
          expirationTtl: 60 * 60 * 24 * 30,
        });
        if (quotaKey) {
          const newQuota = currentQuota + 1;
          await env.AVATAR_CACHE.put(quotaKey, String(newQuota), {
            expirationTtl: 60 * 60 * 48,
          });
        }
      }

      return new Response(
        JSON.stringify({ ok: true, cartoonPng: pngDataUrl, cached: false }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!rawBytes || rawBytes.length === 0) {
      return new Response(
        JSON.stringify({
          error: "AI generation failed (empty result)",
          debugType: typeof aiResult,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const base64 = bytesToBase64(rawBytes);
    const pngDataUrl = `data:image/png;base64,${base64}`;

    // ---------------- STOCKAGE CACHE + MAJ QUOTA ----------------
    if (env.AVATAR_CACHE && cacheKey) {
      // Cache de l'image pour 30 jours
      await env.AVATAR_CACHE.put(cacheKey, pngDataUrl, {
        expirationTtl: 60 * 60 * 24 * 30, // 30 jours
      });

      if (quotaKey) {
        // +1 sur le quota du jour
        const newQuota = currentQuota + 1;
        await env.AVATAR_CACHE.put(quotaKey, String(newQuota), {
          expirationTtl: 60 * 60 * 48,
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, cartoonPng: pngDataUrl, cached: false }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        step: "general_catch",
        error: err?.message ?? "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...makeCorsHeaders(request.headers.get("Origin")),
          "Content-Type": "application/json",
        },
      }
    );
  }
};
