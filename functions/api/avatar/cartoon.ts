// ===================================================
// /functions/api/avatar/cartoon.ts
// IA caricature + fallback client-side
// - Reçoit FormData { image: File, style?: string }
// - Appelle Workers AI @cf/runwayml/stable-diffusion-v1-5-img2img
// - Renvoie { ok, cartoonPng? , error? } en JSON
// ===================================================

type StyleId = "realistic" | "comic" | "flat" | "exaggerated";

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
Flat esport logo caricature of the same person.
Clean vector-like shapes, strong contrast, minimal shading.
Centered face or bust, plain dark background, no text.
    `,
    strength: 0.55,
  },
  exaggerated: {
    prompt: `
Highly exaggerated caricature portrait of the same person.
Big facial features, high contrast, strong shadows.
Still recognizable. Plain dark background, no text, no frame.
    `,
    strength: 0.7,
  },
};

// --------- ID du modèle Workers AI (CORRECT) ---------
const MODEL_ID = "@cf/runwayml/stable-diffusion-v1-5-img2img";

// Petit helper JSON
function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}

export const onRequestPost: PagesFunction<{
  AI: any;
}> = async (context) => {
  const { request, env } = context;

  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return json(
        {
          ok: false,
          error: "bad_request",
          message: "Expected multipart/form-data with field 'image'.",
        },
        400
      );
    }

    const form = await request.formData();
    const imageFile = form.get("image");
    const styleRaw = (form.get("style") as string) || "realistic";

    if (!(imageFile instanceof File)) {
      return json(
        {
          ok: false,
          error: "no_image",
          message: "Champ 'image' manquant dans la requête.",
        },
        400
      );
    }

    const styleId: StyleId =
      (["realistic", "comic", "flat", "exaggerated"] as const).includes(
        styleRaw as StyleId
      )
        ? (styleRaw as StyleId)
        : "realistic";

    const preset = STYLE_PRESETS[styleId];

    // Lecture du fichier en Uint8Array
    const imageArrayBuffer = await imageFile.arrayBuffer();
    const imageUint8 = new Uint8Array(imageArrayBuffer);

    // ---------- Appel Workers AI ----------
    const aiResult = await env.AI.run(MODEL_ID, {
      prompt: preset.prompt,
      image: imageUint8,
      strength: preset.strength,
    });

    // Workers AI renvoie normalement un ArrayBuffer ou Uint8Array pour les modèles image
    let bytes: Uint8Array;

    if (aiResult instanceof ArrayBuffer) {
      bytes = new Uint8Array(aiResult);
    } else if (aiResult instanceof Uint8Array) {
      bytes = aiResult;
    } else {
      // Cas bizarre : on log le type pour debug côté front (/api/avatar/test)
      return json(
        {
          ok: false,
          error: "unexpected_ai_result",
          typeofResult: typeof aiResult,
          constructorName: aiResult && (aiResult as any).constructor?.name,
        },
        500
      );
    }

    // Encodage base64 → dataURL PNG
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:image/png;base64,${base64}`;

    return json({
      ok: true,
      cartoonPng: dataUrl,
      modelId: MODEL_ID,
      style: styleId,
    });
  } catch (err: any) {
    console.error("[avatar/cartoon] AI error", err);
    return json(
      {
        ok: false,
        error: "ai_run_failed",
        message:
          err && err.message
            ? String(err.message)
            : "Unknown error while calling Workers AI.",
      },
      500
    );
  }
};
