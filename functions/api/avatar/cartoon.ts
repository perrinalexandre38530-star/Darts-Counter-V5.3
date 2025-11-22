// ===================================================
// /functions/api/avatar/cartoon.ts
// IA caricature + cache KV + multi-styles + CORS + QUOTA
// Cloudflare Pages Functions + Workers AI (img2img)
// Modèle : SDXL Lightning img2img (Bytedance)
// ===================================================

type StyleId = "realistic" | "comic" | "flat" | "exaggerated";

// --------- Limite quotidienne (sécurité coûts) ---------
const DAILY_QUOTA_LIMIT = 100;

// --------- Styles IA (prompts + strength) ---------
const STYLE_PRESETS: Record<StyleId, { prompt: string; strength: number }> = {
  realistic: {
    prompt: `
Hand-drawn caricature portrait of the same person.
Style: realistic cartoon, warm colors, thick outlines, visible brush strokes.
Emphasize expression and humor without distorting identity.
High quality. Plain dark background. No frame. No text.
    `,
    strength: 0.65,
  },
  comic: {
    prompt: `
Comic-book style caricature portrait of the same person.
Bold outlines, halftone shadows, vibrant colors.
Recognizable face. Plain dark background, no text, no frame.
    `,
    strength: 0.6,
  },
  flat: {
    prompt: `
Vector flat caricature portrait of the same person.
Esport mascot style logo, minimal shading, smooth shapes.
Plain background, no text, no frame.
    `,
    strength: 0.55,
  },
  exaggerated: {
    prompt: `
Highly exaggerated caricature portrait of the same person.
Oversized facial features, humorous, expressive, but still recognizable.
Plain background, no text, no frame.
    `,
    strength: 0.7,
  },
};

// --------- Modèle IA (image-to-image) ---------
// ⚠️ Nouveau modèle Lightning img2img compatible
const MODEL_ID = "@cf/bytedance/stable-diffusion-xl-lightning-img2img";

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
      return new Response(JSON.stringify({ error: "Only POST allowed" }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (!env.AI || typeof env.AI.run !== "function") {
      return new Response(
        JSON.stringify({
          error: "Workers AI binding 'AI' not configured or not available.",
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

    const form = await request.formData();
    const file = form.get("image") as File | null;
    let style = (form.get("style") as string) || "realistic";

    if (!file) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
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
          JSON.stringify({
            ok: true,
            cartoonPng: cached,
            cached: true,
            quotaUsed: false,
          }),
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
              "Le quota quotidien d’avatars IA a été atteint. Réessaie demain.",
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

    // ---------------- IA CLOUDFLARE ----------------
    let aiResult: any;
    try {
      // ⚠️ SDXL Lightning img2img : paramètres adaptés
      const input = {
        prompt: preset.prompt,
        image: [...new Uint8Array(bytes)], // photo d'origine (déjà compressée côté front)
        // strength : 0 = proche de la photo, 1 = très stylisé
        strength: preset.strength,
        // Lightning : très peu d'itérations, 1–8 recommandé
        steps: 4,
        // Guidance faible pour éviter les artefacts
        guidance_scale: 1.0,
      };

      aiResult = await env.AI.run(MODEL_ID, input);
    } catch (aiErr: any) {
      // On renvoie l'erreur IA brute pour comprendre ce qui se passe
      return new Response(
        JSON.stringify({
          ok: false,
          error: "ai_run_failed",
          message: aiErr?.message ?? String(aiErr),
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

    // ---------------- Décodage du résultat IA ----------------
    let base64: string | null = null;

    // Cas 1 : Workers AI renvoie directement un ArrayBuffer
    if (aiResult instanceof ArrayBuffer) {
      base64 = bytesToBase64(new Uint8Array(aiResult));
    }
    // Cas 2 : objet avec propriété .image (ArrayBuffer)
    else if (aiResult && aiResult.image instanceof ArrayBuffer) {
      base64 = bytesToBase64(new Uint8Array(aiResult.image));
    }
    // Cas 3 : tableau de bytes
    else if (Array.isArray(aiResult)) {
      base64 = bytesToBase64(new Uint8Array(aiResult));
    }
    // Cas 4 : certains wrappers renvoient { image_base64: "..." }
    else if (aiResult && typeof aiResult.image_base64 === "string") {
      base64 = aiResult.image_base64;
    }
    // Cas 5 : déjà une string base64
    else if (aiResult && typeof aiResult.image === "string") {
      base64 = aiResult.image;
    }

    if (!base64) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "empty_result",
          message:
            "AI generation failed (empty or unsupported result format).",
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

    const pngDataUrl = base64.startsWith("data:")
      ? base64
      : `data:image/png;base64,${base64}`;

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
          // TTL > 24h, mais la clé inclut la date donc ça reset tout seul
          expirationTtl: 60 * 60 * 48,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        cartoonPng: pngDataUrl,
        cached: false,
        quotaUsed: true,
      }),
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
        ok: false,
        error: "unexpected_error",
        message: err?.message ?? "Unknown error",
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
