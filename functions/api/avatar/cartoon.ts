// ===================================================
// /functions/api/avatar/cartoon.ts
// IA caricature + (optionnel) cache KV pour Cloudflare Pages
// ===================================================

type StyleId = "realistic" | "comic" | "flat" | "exaggerated";

const STYLE_PRESETS: Record<StyleId, { prompt: string; strength: number }> = {
  realistic: {
    prompt: `
      Hand-drawn caricature portrait.
      Style: realistic cartoon, warm colors, thick outlines, visible brush strokes.
      Emphasize facial expression and humor without changing identity.
      Keep facial proportions believable. High quality illustration, no artifacts.
      Plain dark background, no text, no frame.
    `,
    strength: 0.65,
  },
  comic: {
    prompt: `
      Colorful comic-book style caricature portrait.
      Strong black ink outlines, halftone texture, simple shading.
      Fun and expressive but still recognizable.
      Plain dark background, no text, no frame.
    `,
    strength: 0.6,
  },
  flat: {
    prompt: `
      Clean vector-style caricature portrait.
      Flat colors, minimal shading, logo-like, esport mascot style.
      Smooth shapes, no background noise, no text.
    `,
    strength: 0.55,
  },
  exaggerated: {
    prompt: `
      Highly exaggerated caricature portrait.
      Big facial features, very expressive and humorous.
      Still recognizable, but pushed proportions.
      Bold colors, dynamic strokes, no text, no frame.
    `,
    strength: 0.7,
  },
};

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ⚠️ Syntaxe Cloudflare PAGES FUNCTIONS
export const onRequest = async (context: any): Promise<Response> => {
  const { request, env } = context;

  try {
    if (request.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    let style = (formData.get("style") as string | null) || "realistic";

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!["realistic", "comic", "flat", "exaggerated"].includes(style)) {
      style = "realistic";
    }
    const styleId = style as StyleId;
    const preset = STYLE_PRESETS[styleId];

    const bytes = await file.arrayBuffer();

    // ---------- CACHE KV (si AVATAR_CACHE est bindé) ----------
    let cacheKey = "";
    if (env.AVATAR_CACHE) {
      const hash = await sha256Hex(bytes);
      cacheKey = `avatar_v1:${styleId}:${hash}`;
      const cached = await env.AVATAR_CACHE.get(cacheKey);
      if (cached) {
        return new Response(
          JSON.stringify({ ok: true, cartoonPng: cached, cached: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // ---------- IA Workers AI ----------
    const aiResponse: any = await env.AI.run("@cf/lykon/playground-v2.5", {
      prompt: preset.prompt,
      image: [...new Uint8Array(bytes)],
      strength: preset.strength,
      seed: Math.floor(Math.random() * 999999),
    });

    if (!aiResponse || !aiResponse.image) {
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const base64 = aiResponse.image as string;
    const dataUrl = `data:image/png;base64,${base64}`;

    // ---------- Stockage dans le cache ----------
    if (env.AVATAR_CACHE && cacheKey) {
      await env.AVATAR_CACHE.put(cacheKey, dataUrl, {
        expirationTtl: 60 * 60 * 24 * 30, // 30 jours
      });
    }

    return new Response(
      JSON.stringify({ ok: true, cartoonPng: dataUrl, cached: false }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
