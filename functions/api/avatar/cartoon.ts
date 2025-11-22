// ===================================================
// /functions/api/avatar/cartoon.ts
// IA caricature + cache KV + multi-styles
// Cloudflare Pages Functions
// ===================================================

type StyleId = "realistic" | "comic" | "flat" | "exaggerated";

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

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// -------------- PAGES FUNCTION --------------
export const onRequest = async (context: any): Promise<Response> => {
  const { request, env } = context;

  try {
    if (request.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    const form = await request.formData();
    const file = form.get("image") as File | null;
    let style = (form.get("style") as string) || "realistic";

    if (!file) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!["realistic", "comic", "flat", "exaggerated"].includes(style)) {
      style = "realistic";
    }
    const styleId = style as StyleId;
    const preset = STYLE_PRESETS[styleId];

    const bytes = await file.arrayBuffer();

    // ---------------- CACHE ----------------
    let cacheKey = "";
    if (env.AVATAR_CACHE) {
      const hash = await sha256Hex(bytes);
      cacheKey = `avatar:${styleId}:${hash}`;
      const cached = await env.AVATAR_CACHE.get(cacheKey);
      if (cached) {
        return new Response(JSON.stringify({ ok: true, cartoonPng: cached }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // ---------------- IA ----------------
    const aiResponse: any = await env.AI.run("@cf/lykon/playground-v2.5", {
      prompt: preset.prompt,
      image: [...new Uint8Array(bytes)],
      strength: preset.strength,
      seed: Math.floor(Math.random() * 999999),
    });

    if (!aiResponse || !aiResponse.image) {
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const pngDataUrl = `data:image/png;base64,${aiResponse.image}`;

    // ---------------- STORE CACHE ----------------
    if (env.AVATAR_CACHE && cacheKey) {
      await env.AVATAR_CACHE.put(cacheKey, pngDataUrl, {
        expirationTtl: 60 * 60 * 24 * 30,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, cartoonPng: pngDataUrl }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err?.message ?? "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
