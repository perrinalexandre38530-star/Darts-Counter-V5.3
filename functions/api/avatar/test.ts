// ===================================================
// /functions/api/avatar/test.ts
// Petit endpoint de test Workers AI (img2img)
// ===================================================

const MODEL_ID = "@cf/runwayml/stable-diffusion-v1-5-img2img";

export const onRequest = async (context: any): Promise<Response> => {
  const { env } = context;

  if (!env.AI || typeof env.AI.run !== "function") {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "no_ai_binding",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // On utilise la même petite image de test que dans la doc
    const exampleInputImage = await fetch(
      "https://pub-1fb693cb11cc46b2b2f656f51e015a2c.r2.dev/dog.png"
    );
    const buf = await exampleInputImage.arrayBuffer();

    const result = await env.AI.run(MODEL_ID, {
      prompt: "Turn this dog into a cartoon-style portrait.",
      image: [...new Uint8Array(buf)],
      strength: 0.5,
      guidance: 7.5,
      num_steps: 20,
    });

    // On renvoie directement le résultat brut pour voir si c'est bien une image
    if (result instanceof ArrayBuffer || result instanceof Uint8Array) {
      return new Response(result as any, {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    }

    // Fallback: JSON avec debug
    return new Response(
      JSON.stringify({
        ok: false,
        error: "unexpected_ai_result",
        typeofResult: typeof result,
        isArrayBuffer: result instanceof ArrayBuffer,
        isUint8Array: result instanceof Uint8Array,
        isBlob:
          typeof Blob !== "undefined" && result instanceof Blob,
        keys: result ? Object.keys(result) : [],
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "ai_run_failed",
        message: e?.message ?? String(e),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
