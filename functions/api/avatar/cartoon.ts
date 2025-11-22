// ===================================================
// /functions/api/avatar/cartoon.ts
// IA caricature via Cloudflare Workers AI (img2img)
// Utilise : @cf/stable-diffusion-v1.5-img2img
// ===================================================

export const onRequestPost = async ({ request, env }) => {
  try {
    const form = await request.formData();
    const file = form.get("image");
    const style = form.get("style") || "realistic";

    if (!file || typeof file === "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_image" }),
        { status: 400 }
      );
    }

    // 🟦 Modèle Cloudflare image → image
    const MODEL = "@cf/stable-diffusion-v1.5-img2img";

    // Lecture du buffer
    const inputArrayBuffer = await file.arrayBuffer();
    const inputBytes = new Uint8Array(inputArrayBuffer);

    // Prompt selon style choisi
    const prompts = {
      realistic:
        "Professional caricature illustration of the same person, warm colors, clean lines, detailed face, high quality.",
      comic:
        "Comic-book caricature portrait of the same person, bold outlines, halftone shadows, vibrant colors.",
      flat:
        "Minimalist esport-style avatar logo of the same person, flat colors, clean vector shapes.",
      exaggerated:
        "Exaggerated caricature portrait, big head, funny proportions, vibrant colors, high contrast."
    };

    const prompt = prompts[style] || prompts.realistic;

    // Appel Cloudflare AI
    const result: any = await env.AI.run(MODEL, {
      prompt,
      image: [...inputBytes], // input photo
      strength: 0.65, // niveau de transformation
    });

    if (!result?.image) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "unexpected_ai_result",
          debug: result,
        }),
        { status: 500 }
      );
    }

    // Encodage base64
    const base64 = `data:image/png;base64,${result.image}`;

    return new Response(
      JSON.stringify({
        ok: true,
        cartoonPng: base64,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "exception", message: String(err) }),
      { status: 500 }
    );
  }
};
