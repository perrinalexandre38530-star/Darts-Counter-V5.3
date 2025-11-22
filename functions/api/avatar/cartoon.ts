// ===================================================
// functions/api/avatar/cartoon.ts
// Backend Cloudflare Pages + Workers AI (img2img)
// Reçoit: FormData (image + style)
// Renvoie: { ok: true, cartoonPng: "data:image/png;base64,..." }
// ===================================================

type StyleId = "realistic" | "comic" | "flat" | "exaggerated";

const DAILY_QUOTA_LIMIT = 100;

// Prompts + strength par style
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
Flat esport logo caricature of the same person.
Strong outlines, minimal shading, high contrast.
Centered head and shoulders inside a circular frame. No background image.
    `,
    strength: 0.7,
  },
  exaggerated: {
    prompt: `
Extreme caricature of the same person.
Very exaggerated facial features, strong shadows, dramatic contrast.
Painterly comic style, but the person is still clearly recognizable.
Plain dark background. No text. No frame.
    `,
    strength: 0.55,
  },
};

// 🧠 Choisis BIEN ce modèle : il doit exister dans ton onglet "Models"
// Sur ton screen c'était "stable-diffusion-v1-5-img2img" → prefix officiel :
const MODEL_ID = "@cf/runwayml/stable-diffusion-v1-5-img2img";

// CORS basiques pour ton front
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const onRequest: PagesFunction<{ AI: any }> = async (ctx) => {
  const { request, env } = ctx;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return json(
      { ok: false, error: "method_not_allowed" },
      { status: 405 }
    );
  }

  try {
    // ---------- Sécurité quota DAILY (localStorage Workers KV plus tard si tu veux) ----------
    // Pour l'instant on ne bloque pas vraiment, on laisse à 100 / jour à implémenter plus tard.

    const contentType = request.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return json(
        {
          ok: false,
          error: "invalid_content_type",
          message: "Expected multipart/form-data",
        },
        { status: 400 }
      );
    }

    const form = await request.formData();
    const image = form.get("image");
    const styleField = (form.get("style") as string) || "realistic";

    // Style safe
    const style: StyleId =
      styleField === "comic" ||
      styleField === "flat" ||
      styleField === "exaggerated"
        ? styleField
        : "realistic";

    if (!(image instanceof File)) {
      return json(
        {
          ok: false,
          error: "no_image",
          message: "No image file received",
        },
        { status: 400 }
      );
    }

    const imgBuffer = await image.arrayBuffer();
    const imgBytes = new Uint8Array(imgBuffer);

    const preset = STYLE_PRESETS[style];

    // ⚠️ TRÈS IMPORTANT : on n’envoie QUE 3 CHAMPS (prompt, image, strength)
    // Pas de null / undefined → plus d'erreur "invalid or incomplete input"
    const inputs = {
      prompt: preset.prompt,
      image: imgBytes,
      strength: preset.strength,
    };

    const aiResult = await env.AI.run(MODEL_ID, inputs) as {
      image?: ArrayBuffer | Uint8Array;
    };

    if (!aiResult || !aiResult.image) {
      return json(
        {
          ok: false,
          error: "no_image_returned",
          message: "No image returned by Workers AI.",
        },
        { status: 500 }
      );
    }

    const outBytes =
      aiResult.image instanceof Uint8Array
        ? aiResult.image
        : new Uint8Array(aiResult.image);

    const base64 = toBase64(outBytes);
    const dataUrl = `data:image/png;base64,${base64}`;

    return json(
      {
        ok: true,
        cartoonPng: dataUrl,
        model: MODEL_ID,
        style,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[avatar/cartoon] Error:", err);

    return json(
      {
        ok: false,
        error: "ai_run_failed",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
};

// ---------- Helpers ----------

function json(body: unknown, init?: ResponseInit) {
  const headers = {
    ...CORS_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    ...(init?.headers || {}),
  };
  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // @ts-ignore
  return btoa(binary);
}
