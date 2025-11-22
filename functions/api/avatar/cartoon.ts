// ===================================================
// /functions/api/avatar/cartoon.ts
// IA caricature + cache KV + multi-styles + CORS + QUOTA
// Cloudflare Pages Functions
// ===================================================

type StyleId = "realistic" | "comic" | "flat" | "exaggerated";

// --------- Limite quotidienne ---------
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
      Oversized facial features, humorous, expressive, but recognizable.
      Plain background, no text, no frame.
    `,
    strength: 0.7,
  },
};

// --------- Modèle IA (image-to-image) ---------
const MODEL_ID = "@cf/runwayml/stable-diffusion-v1-5-img2img";
// Si tu changes de modèle (ex : Dreamshaper), adapte simplement cette ligne.

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

    // ---------------- IA CLOUDFLARE ----------------
    const input = {
      prompt: preset.prompt,
      // image-to-image : on envoie la photo originale
      image: [...new Uint8Array(bytes)],
      strength: preset.strength, // entre 0 et 1
      num_steps: 18,
    };

    const aiResult: any = await env.AI.run(MODEL_ID, input);

    // aiResult peut être un ArrayBuffer directement ou un objet { image: ArrayBuffer }
    let rawBytes: Uint8Array | null = null;

    if (aiResult instanceof ArrayBuffer) {
      rawBytes = new Uint8Array(aiResult);
    } else if (aiResult && aiResult.image instanceof ArrayBuffer) {
      rawBytes = new Uint8Array(aiResult.image);
    } else if (Array.isArray(aiResult)) {
      rawBytes = new Uint8Array(aiResult);
    }

    if (!rawBytes || rawBytes.length === 0) {
      return new Response(
        JSON.stringify({ error: "AI generation failed (empty result)" }),
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
          // TTL légèrement > 24h, mais la clé inclut la date donc ça reset tout seul
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
    // 🔥 catch VERBEUX pour voir l'erreur réelle côté Network
    console.error("Avatar cartoon error:", err);

    return new Response(
      JSON.stringify({
        error: err?.message ?? "Unknown error",
        details:
          err && typeof err === "object"
            ? JSON.stringify(err, null, 2)
            : String(err),
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
