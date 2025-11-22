// ===================================================
// /functions/api/avatar/cartoon.ts
// IA caricature + cache KV + multi-styles + CORS + QUOTA
// Cloudflare Pages Functions + Workers AI (img2img)
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
const MODEL_ID = "@cf/runwayml/stable-diffusion-v1-5-img2img";

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

/**
 * Transforme TOUT ce que peut renvoyer Workers AI en data:image/png;base64
 * - ArrayBuffer
 * - Uint8Array
 * - Blob
 * - Response-like avec .arrayBuffer()
 * - Objet avec .image / .image_base64
 */
async function aiResultToPngDataUrl(result: any): Promise<string> {
  if (!result) {
    throw new Error("Empty AI result");
  }

  // 1) Cas binaires directs
  let bytes: Uint8Array | null = null;

  if (result instanceof ArrayBuffer) {
    bytes = new Uint8Array(result);
  } else if (result instanceof Uint8Array) {
    bytes = result;
  } else if (typeof Blob !== "undefined" && result instanceof Blob) {
    bytes = new Uint8Array(await result.arrayBuffer());
  } else if (typeof result.arrayBuffer === "function") {
    // Response-like / Blob-like
    const buf = await result.arrayBuffer();
    bytes = new Uint8Array(buf);
  } else if (result.image instanceof ArrayBuffer) {
    bytes = new Uint8Array(result.image as ArrayBuffer);
  } else if (
    typeof Uint8Array !== "undefined" &&
    result.image instanceof Uint8Array
  ) {
    bytes = result.image as Uint8Array;
  } else if (
    typeof Blob !== "undefined" &&
    result.image instanceof Blob
  ) {
    bytes = new Uint8Array(await (result.image as Blob).arrayBuffer());
  }

  if (bytes) {
    return `data:image/png;base64,${bytesToBase64(bytes)}`;
  }

  // 2) Cas strings base64
  if (typeof result.image_base64 === "string") {
    return result.image_base64.startsWith("data:")
      ? result.image_base64
      : `data:image/png;base64,${result.image_base64}`;
  }
  if (typeof result.image === "string") {
    return result.image.startsWith("data:")
      ? result.image
      : `data:image/png;base64,${result.image}`;
  }

  throw new Error("Unsupported AI result type for PNG conversion");
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

    const bytesBuf = await file.arrayBuffer();

    // ---------------- CACHE + QUOTA (KV) ----------------
    let cacheKey = "";
    let quotaKey = "";
    let currentQuota = 0;

    if (env.AVATAR_CACHE) {
      // 1) Cache par hash de l'image + style
      const hash = await sha256Hex(bytesBuf);
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
      const input = {
        prompt: preset.prompt,
        // image-to-image : on envoie la photo originale
        image: [...new Uint8Array(bytesBuf)],
        strength: preset.strength, // 0..1, plus c'est haut plus ça s'éloigne de la photo
        num_steps: 25,
        guidance: 7.5,
      };

      aiResult = await env.AI.run(MODEL_ID, input);
    } catch (aiErr: any) {
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
    let pngDataUrl: string;
    try {
      pngDataUrl = await aiResultToPngDataUrl(aiResult);
    } catch (decodeErr: any) {
      const debug: any = {
        typeofResult: typeof aiResult,
        isArrayBuffer: aiResult instanceof ArrayBuffer,
        isUint8Array: aiResult instanceof Uint8Array,
        isBlob:
          typeof Blob !== "undefined" && aiResult instanceof Blob,
        hasImageProp: !!(aiResult && "image" in aiResult),
        hasImageBase64Prop: !!(aiResult && "image_base64" in aiResult),
        keys: aiResult ? Object.keys(aiResult) : [],
      };

      return new Response(
        JSON.stringify({
          ok: false,
          error: "ai_result_decode_failed",
          message: decodeErr?.message ?? String(decodeErr),
          debug,
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
