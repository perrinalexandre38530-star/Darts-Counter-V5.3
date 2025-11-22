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
    strength: 0.55,
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
    strength: 0.65,
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
// Nouveau modèle Cloudflare AI 2025 (l'ancien runwayml est déprécié)
const MODEL_ID = "@cf/hunyuan/hunyuan_diT_img2img";

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
      const input = {
        prompt: preset.prompt,
        // image-to-image : on envoie la photo originale
        image: [...new Uint8Array(bytes)],
        strength: preset.strength, // 0..1, plus c'est haut plus ça s'éloigne de la photo
        num_steps: 20, // max pour ce modèle
        guidance: 7.5,
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
    // Pour Workers AI image, la sortie est (en pratique) binaire : Uint8Array, ArrayBuffer ou flux.
    let buf: Uint8Array | null = null;

    if (aiResult instanceof Uint8Array) {
      buf = aiResult;
    } else if (aiResult instanceof ArrayBuffer) {
      buf = new Uint8Array(aiResult);
    } else if (
      aiResult &&
      typeof aiResult === "object" &&
      "image" in aiResult &&
      (aiResult as any).image instanceof ArrayBuffer
    ) {
      buf = new Uint8Array((aiResult as any).image);
    } else if (Array.isArray(aiResult)) {
      buf = new Uint8Array(aiResult as number[]);
    } else if (
      aiResult &&
      typeof (aiResult as any).arrayBuffer === "function"
    ) {
      const ab = await (aiResult as any).arrayBuffer();
      buf = new Uint8Array(ab);
    } else if (
      aiResult &&
      (typeof (aiResult as any).image_base64 === "string" ||
        typeof (aiResult as any).image === "string")
    ) {
      // Certains wrappers renvoient directement une string base64
      const rawBase64 =
        (aiResult as any).image_base64 ?? (aiResult as any).image;
      const pngDataUrl = rawBase64.startsWith("data:")
        ? rawBase64
        : `data:image/png;base64,${rawBase64}`;

      // Cache + quota éventuels
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
    } else {
      // 👉 Debug ultra-verbeux si Workers AI change de format
      return new Response(
        JSON.stringify(
          {
            ok: false,
            error: "unexpected_ai_result",
            debugType: typeof aiResult,
            debugInstanceOfUint8Array: aiResult instanceof Uint8Array,
            debugInstanceOfArrayBuffer: aiResult instanceof ArrayBuffer,
            debugKeys:
              aiResult && typeof aiResult === "object"
                ? Object.keys(aiResult as any)
                : null,
          },
          null,
          2
        ),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!buf) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "empty_result",
          message: "AI generation failed (no binary data).",
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

    const base64 = bytesToBase64(buf);
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
