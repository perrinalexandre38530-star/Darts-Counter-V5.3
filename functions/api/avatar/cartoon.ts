// ===================================================
// /functions/api/avatar/cartoon.ts
// IA caricature + cache KV + multi-styles + CORS
// Cloudflare Pages Functions
// ===================================================

type StyleId = "realistic" | "comic" | "flat" | "exaggerated";

// --------- Modèle Workers AI utilisé ---------
// (img2img = on part d'une photo existante)
const MODEL_ID = "@cf/runwayml/stable-diffusion-v1-5-img2img";

// --------- Styles IA (prompts + strength) ---------
const STYLE_PRESETS: Record<StyleId, { prompt: string; strength: number }> = {
  realistic: {
    prompt: `
      Hand-drawn caricature portrait.
      Style: realistic cartoon, warm colors, thick outlines, visible brush strokes.
      Emphasize expression and humor without distorting identity.
      High quality. Plain dark background. No frame. No text.
    `,
    strength: 0.65,
  },
  comic: {
    prompt: `
      Comic-book style caricature portrait.
      Bold outlines, halftone shadows, vibrant colors.
      Recognizable face. Plain dark background.
    `,
    strength: 0.6,
  },
  flat: {
    prompt: `
      Vector flat caricature portrait.
      Esport mascot style, minimal shading, smooth shapes.
      No text, no frame, plain background.
    `,
    strength: 0.55,
  },
  exaggerated: {
    prompt: `
      Highly exaggerated caricature portrait.
      Oversized facial features, humorous, expressive.
      Recognizable face. Plain background.
    `,
    strength: 0.7,
  },
};

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

// --------- Utilitaire hash pour le cache KV ---------
async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

  // CORS strict : uniquement depuis Pages.dev + webcontainer
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

    // ---------------- CACHE KV ----------------
    let cacheKey = "";
    if (env.AVATAR_CACHE) {
      const hash = await sha256Hex(bytes);
      cacheKey = `avatar:${styleId}:${hash}`;
      const cached = await env.AVATAR_CACHE.get(cacheKey);
      if (cached) {
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
    }

    // ---------------- IA CLOUDFLARE ----------------
    let aiResponse: any;
    try {
      aiResponse = await env.AI.run(MODEL_ID, {
        prompt: preset.prompt,
        image: [...new Uint8Array(bytes)],
        strength: preset.strength,
        // tu peux rajouter num_steps, etc. si besoin
      });
    } catch (e: any) {
      console.error("[avatar/cartoon] env.AI.run error:", e);
      throw new Error(e?.message || "AI.run failed");
    }

    if (!aiResponse || !aiResponse.image) {
      return new Response(
        JSON.stringify({ error: "AI generation failed", details: aiResponse }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const pngDataUrl = `data:image/png;base64,${aiResponse.image}`;

    // ---------------- STOCKAGE CACHE ----------------
    if (env.AVATAR_CACHE && cacheKey) {
      await env.AVATAR_CACHE.put(cacheKey, pngDataUrl, {
        expirationTtl: 60 * 60 * 24 * 30, // 30 jours
      });
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
    console.error("[avatar/cartoon] global error:", err);
    return new Response(
      JSON.stringify({
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
